# Import review session redesign

**Parent:** [PLO-107](https://linear.app/ploutizo/issue/PLO-107)

## Problem Statement

**Review import** feels fragile: typing is interrupted, the grid re-renders aggressively, and saves generate many small database writes. The implementation carries overlapping client stores (per-row paced saves, durable selection, database-backed **prepared import set** staging, revision invalidation, and duplicate evaluation paths). Resuming a draft persists checkbox state the user may no longer want, and the path from **Review import** to **Finalize import** requires round-trips through staging tables that do not match how people actually work (edit content, pick rows, continue, confirm).

Household members need a fast, predictable review experience where only **reviewed import values** survive across sessions, selection is a session decision until **Continue**, and saves batch quietly after edits settle.

## Solution

Redesign **Review import** around one **draft-scoped client session**: optimistic updates into a TanStack DB rows collection, a single **3 second trailing debounce** that PATCHes **only dirty rows** in one atomic batch request, and **session-only** selection plus **Import finalize preview** (replacing the retired **Prepared import set**).

**Continue** sends the checked `rowIds` to a **stateless** server verification that returns the full-file **Import finalize preview**. **Finalize import** sends `{ rowIds }` only; the server re-verifies and completes the batch idempotently. Database staging tables, durable selection, and per-row PATCH are removed.

## User Stories

1. As a household member resuming an **import draft**, I want my **reviewed import values** restored, so that I can keep correcting the upload without re-entering work.
2. As a household member resuming an **import draft**, I want row checkboxes reset to a sensible default (all **ready** rows checked, attention rows unchecked), so that I am not stuck with an old **import set** I did not intend.
3. As a household member editing during **Review import**, I want fields to update instantly in the UI, so that review feels responsive.
4. As a household member editing during **Review import**, I want saves to run after I pause typing (~3 seconds), so that the app does not hammer the server on every field change.
5. As a household member editing multiple fields on one row, I want those changes saved together in one request, so that persistence matches how I edit a row.
6. As a household member editing several rows within a few seconds, I want all pending changes merged into one batch save when I stop, so that network use stays reasonable.
7. As a household member, I want **Continue** disabled while changes are still pending or saving or after a failed save, so that I cannot advance on stale or unsaved content.
8. As a household member, I want clear feedback for save state (unsaved, saving, saved, failed) separate from **Continue** loading, so that I understand why I cannot proceed.
9. As a household member, I want **Continue** to show a loading state while verification runs, so that I know the app is preparing **Finalize import**.
10. As a household member, I want to check only rows that are **ready** to import, so that I cannot accidentally include unresolved rows in my **import set**.
11. As a household member entering **Review import**, I want every **ready** row checked and every **needs review** or **invalid** row unchecked and disabled, so that defaults match what I am likely to import.
12. As a household member, I want **select all** to affect only rows I am allowed to check, so that bulk selection stays safe.
13. As a household member whose row becomes **ready** while I review, I want it auto-checked when my household prefers that, so that I save clicks.
14. As a household admin, I want a household setting to turn off auto-check when rows become **ready**, so that my household can opt into manual selection.
15. As a household member, I want toggling selection to update match decisions in the UI without a network call, so that review stays smooth.
16. As a household member clicking **Continue**, I want the server to verify my **import set** and show an **Import finalize preview** with full-file outcome counts, so that I see created, matched, skipped, and invalid rows before committing.
17. As a household member on **Finalize import**, I want to see the same preview I got at **Continue**, without another database staging fetch, so that the step feels instant.
18. As a household member refreshing on **Finalize import** without an active preview session, I want to be sent back to **Review import**, so that I cannot confirm without context.
19. As a household member going back from **Finalize import** to **Review import**, I want my **reviewed import values** kept but selection reset to defaults and the preview discarded, so that I can change my mind cleanly.
20. As a household member confirming **Finalize import**, I want the server to re-check requirements on the current draft rows and my `rowIds`, so that I am protected if something changed after preview.
21. As a household member, I want **Finalize import** to be idempotent if I retry after success, so that I do not create duplicate transactions.
22. As a household member leaving **Review import** with unsaved edits, I want a warning and best-effort save, so that I do not lose **reviewed import values** silently.
23. As a household member on the **Import hub**, I want live review counts from evaluation, not stale selection persisted in the database, so that hub state matches review rules.
24. As a developer, I want one primary test seam at the import HTTP API (batch save, continue, finalize), so that behavior is verified without brittle UI coupling.
25. As a developer, I want **ADR 0005** and **CONTEXT.md** to match the new model, so that future work does not reintroduce durable selection or **Prepared import set** staging.

## Implementation Decisions

### Durable vs session facts

| Durable (Postgres) | Session (client) |
| --- | --- |
| **Reviewed import values** on import draft rows | Checkbox **import set** (`rowIds`) |
| Import batch meta, lifecycle, `rowCount`, source facts | **Import finalize preview** DTO |
| Completed **import** history after finalize | Save status: pending / saving / saved / failed |
| | Derived **import row status** (recomputed) |

Retire **Prepared import set** as a stored entity. Introduce **Import finalize preview** as the domain name for the Continue response held in the draft session until **Finalize import** or abandon.

### Schema cleanup

- Drop `import_prepared_sets`, `import_prepared_outcomes`, and related enum/types used only for staging.
- Remove `selected_for_import` from import batch rows.
- Remove `import_batches.revision` and `finalized_prepared_set_id` (and any constraints/indexes only used for prepared staging).
- Remove dead code paths that bumped revision or invalidated staging on row/selection writes.

### API surface

**Remove**

- `PATCH /imports/rows/:id`
- `PATCH /imports/drafts/:id/rows/selection`
- `GET /imports/drafts/:id/prepared`
- `DELETE /imports/drafts/:id/prepared`
- Finalize body field `preparedSetId`

**Add / change**

- `PATCH /imports/drafts/:id/rows` — batch only; body contains updates for **dirty rows only**; single transaction (all-or-nothing); returns updated rows and any fact sidecars needed by the client.
- `POST /imports/drafts/:id/continue` — body `{ rowIds: string[] }`; stateless; runs **import set verification**; response is **Import finalize preview** (full-file projection, same informational shape the Finalize UI needs today).
- `POST /imports/drafts/:id/finalize` — body `{ rowIds: string[] }`; re-verify; execute finalize; idempotent when batch already completed.

### Client session (single module)

One draft-scoped session while import routes are mounted:

- TanStack DB `queryCollection` for rows — authority for **reviewed import values**.
- Slim TanStack Query meta from draft GET.
- One `createPacedMutations` instance per draft with `debounceStrategy({ wait: 3000, trailing: true })`.
- `onMutate`: optimistic `collection.update` for each patch; mark rows dirty.
- `mutationFn`: build diffs vs per-row persist baseline (last server ack); one batch PATCH; advance baselines on success; keep edits on failure.
- Selection: in-memory only; apply match-decision helpers on toggle; no selection API.
- **Import finalize preview**: stored on successful Continue; required for Finalize route; cleared on back to Review, discard, finalize success, or leaving import scope.
- One debounced evaluation pipeline for derived status (avoid duplicate full-draft eval on every keystroke).

### Selection rules

- Checkbox **enabled** only when derived status is `ready` (replace prior “selectable = not invalid” behavior).
- On Review entry: check all `ready` rows; `needs_review` and `invalid` unchecked and disabled.
- If a row stops being `ready`, uncheck and disable.
- Household setting `autoCheckImportRowWhenReady` (default **true**): when a row transitions to `ready` during the session, auto-check unless setting is off.

### Continue / Finalize UX

- **Continue**: `LoadingButton` with `loadingText` only while Continue request runs; save lifecycle stays in the autosave status slot.
- Continue disabled when: no selection, pending debounce, batch save in flight, or failed save (until retry succeeds).
- **Finalize**: existing `LoadingButton` pattern; preview from session; redirect to Review if preview missing.

### ADR and glossary

- Amend **ADR 0005** to describe resume = **reviewed import values** only, batch persist, session selection, and **Import finalize preview**.
- Update **CONTEXT.md**: **Import draft** no longer persists selection; retire **Prepared import set**; update **Matched import row** default-selection language; add **Import finalize preview**.

### Session state machine (draft save — from design alignment)

```text
idle → pending (dirty) → saving → saved | failed
failed → saving (retry) → saved | failed
Continue enabled only when: ≥1 selected row AND state is saved (no pending/saving/failed)
```

## Testing Decisions

**Principle:** Test observable behavior at the highest stable seam—HTTP API and shared evaluators—not internal session maps or debounce timers.

**Primary seam:** Import API integration tests covering:

- Batch PATCH merges multiple rows atomically; rejects partial invalid payloads without committing.
- Continue with `rowIds` returns preview counts matching evaluator projection.
- Finalize with `rowIds` creates completed result; repeat finalize returns same outcome (idempotent).
- Continue/Finalize reject not-ready selected rows with requirement failures.

**Secondary seam:** Web data-access tests for the draft session (flush, dirty batching, preview lifecycle) where API tests cannot cover router/session boundaries—follow patterns in existing import review session tests.

**Prior art:** Import route tests, prepared-set/fixture tests (to be replaced), `useImportReviewSession` tests, import-finalize service tests.

## Out of Scope

- Pagination or split GET for draft rows (still one GET).
- IndexedDB/offline persistence of review session.
- Changing **Initial import classification** or hub upload flows beyond settings exposure.
- Merging **Review import** and **Finalize import** into one route (two steps remain).
- New finalize fingerprint/token beyond server re-verify on `{ rowIds }`.
- Per-field autosave failure maps (draft-level save failure is enough unless UX requires row icons from batch errors).

## Further Notes

- Supersedes the incremental autosave approach documented in PLO-107’s earlier resolution notes; this is an intentional architectural replacement.
- **Testing seam check:** API integration tests for `PATCH drafts/:id/rows` → `POST continue` → `POST finalize` as the single golden path; client session tests only for session-only concerns (preview redirect, selection defaults, household auto-check).
