---
status: accepted
---

# Import review session

During **Review import**, the UI must feel instant while corrections persist onto the durable **import draft** so drafts remain resumable. Earlier designs layered per-row paced saves, durable selection, database-backed prepared import set staging, and revision invalidation; each added a write path and a way for stores to disagree. Review now runs as one **draft-scoped client session** in which only **reviewed import values** are durable.

## Decision

### Authority

| Layer                              | Role                                                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Postgres via API                   | Durable **import draft facts**: source provenance, parsed values, reviewed import values, refund references, tags, assignees, settlement funding, `rowCount`, and batch lifecycle. Does not persist selection, review status, or previews. |
| TanStack DB rows `queryCollection` | Session working copy while review is mounted; the only place components write row data, including session selection                                                                                                                        |
| Slim TanStack Query (draft meta)   | Account, file name, batch lifecycle, `rowCount`, live derived review counts, and other non-row context                                                                                                                                     |
| Review session                     | Session-only facts: the checkbox **import set**, the **Import finalize preview**, and save status                                                                                                                                          |
| Controlled inputs                  | Presentation only, never a second store or authority                                                                                                                                                                                       |
| **Import row status** / counts     | Derived from durable facts plus external facts by the shared evaluator. Client writer: `rederiveImportDraftWorkingCopy`. Server **import set verification** (ADR 0004) is authoritative at Continue and Finalize.                          |

Hub create / discard / list stay on TanStack Query and are **outside** the session contract. The Import hub derives live review counts from current draft rows with the same evaluator.

### Session boundary

Session rules apply while the import routes for one draft are mounted and the draft is still active. Leaving import scope ends the session: selection and the Import finalize preview are dropped, and reviewed import values remain on the draft. Returning re-hydrates from GET.

### Hydration

Keep a single `GET /drafts/:id` that returns meta + rows. The client seeds the rows collection from `rows` and the meta query from the rest. Rows arrive without selection; the session applies selection defaults. Do **not** split the API into meta + rows endpoints until pagination or payload size requires it.

### Write path (one surface)

All review cells (text, discrete picks, tags) and selection update the rows collection only. Components call the session's `updateRow` / `setSelection`; they never choose between local state, cache, and API.

### Persistence

| Rule       | Choice                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| Endpoint   | `PATCH /imports/drafts/:id/rows`, batch only, one database transaction (all-or-nothing)      |
| Payload    | Only dirty rows; per row, only fields changed since the last server acknowledgement          |
| Pacing     | One paced mutation per draft, `debounceStrategy({ wait: 3000, trailing: true })`             |
| Merge      | Edits across rows within the window merge into one batch request                             |
| On success | Advance per-row persist baselines; confirm server values without clobbering newer live edits |
| On failure | Keep collection edits; mark the draft Failed; Retry re-sends the current dirty diff          |

### Selection

Selection is session-only: toggles write the collection and apply the shared match-decision helpers in the working copy, with no network call. There is no selection API. Continue sends the checked `rowIds`; the server re-applies the same match decisions during import set verification.

### Continue and Finalize

- **Continue** flushes pending saves, then `POST /imports/drafts/:id/continue` with `{ rowIds }`. The response is the **Import finalize preview**, held in the session.
- **Finalize import** reads the preview from the session (redirecting to Review when it is missing), then `POST /imports/drafts/:id/finalize` with `{ rowIds }`. The server re-verifies and completes idempotently.
- Going back to Review, discarding, finalizing, or leaving import scope clears the preview.

### Ephemeral handoff channels

Review uses two **non-persisted** transports; do not add a third without updating this ADR.

| Channel                     | Storage                                                   | Lifetime                                                                  | Carries                                                                                                                    |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Import finalize preview** | TanStack Query cache (`importFinalizePreviewSession` key) | From successful Continue until Finalize, discard, or leaving import scope | Server-verified preview payload and `rowIds` for the Finalize route                                                        |
| **Review router state**     | TanStack Router `location.state.importReview`             | One navigation (often `replace: true` after consume)                      | UX signals only: `prepareAgain` (reset selection defaults on Review), optional `issues` when redirected from a failed gate |

Continue/Finalize authority stays on the API; the preview cache is the product handoff to Finalize. Router state is not a second preview store.

### Autosave UX

| Concern                 | Behavior                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status surface          | **Draft-level** status in a fixed-height slot below Continue: Saving → Saved (brief) → Failed · Retry. The slot stays mounted so the header does not shift |
| Render isolation        | Autosave store subscriptions live in the review header, leave guard, and row provider, **not** the session hook or grid state hook                         |
| Persist failure         | **Keep collection edits**; do not roll back the working copy                                                                                               |
| Continue gate           | Disabled with no selection, pending debounce, save in flight, or Failed (until Retry succeeds). In-flight Continue aborts when new work starts saving      |
| In-app leave            | Flush pending work; block leave if flush fails or Failed remains                                                                                           |
| Tab close / refresh     | Best-effort flush (`visibilitychange` / `beforeunload`); warn when pending or failed. Browsers cannot reliably await                                       |
| Text vs discrete writes | Same path and same debounce. Text inputs may keep focused chrome so typing is not clobbered; they are not a second store                                   |

Continue and Finalize action labels are self-explanatory; do not add subtitle hints beneath those buttons.

### Fact model

1. **Import draft facts**: source provenance, parsed values, and reviewed import values. Durable and resumable.
2. **Review evaluation**: derived status, blockers, invalid reasons, refund-link and match issues, live review counts. GET, the working copy, the Import hub, and import set verification share the evaluator.
3. **Session facts**: the import set and the Import finalize preview. Never persisted.
4. **Completed import result**: batch lifecycle and finalized outcome counts (`created`, `matched`, `skipped`, `invalid`) for Import history. These are separate from review-status counts.
5. **Transaction provenance**: links from created or matched transactions back to the import batch and source identity.

`rowCount` is an immutable upload/source fact. `skipped` is an import row outcome, not a Review import status. Import history answers “what happened to this uploaded file?” for completed and discarded batches; active drafts stay on the Import hub.

## Considered options

| Option                                             | Rejected because                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Durable selection (`selected_for_import`)          | Resumed drafts restore an import set the user no longer intends; adds a write path and a bulk API |
| Database-staged prepared import set with revisions | Duplicates verification, forces Continue → Finalize round-trips, and needs revision invalidation  |
| Per-row paced queues and per-row PATCH             | Many small writes; edits across rows cannot share one atomic save                                 |
| RQ nested `ImportDraft` as the live edit model     | Manual merge/rollback; encourages a second local buffer; caused whole-draft restore clobber       |
| Local field state as authority for text            | Multiple truths and flush rules; keep only as short-lived input chrome                            |
| Dual debounce (short discrete / long text)         | Minor UX gain for extra branching and a second store                                              |
| Full-row blind server merge on success             | Clobbers in-flight fields; confirm only acknowledged fields                                       |
| Working-copy rollback on PATCH failure             | Forces re-entry of edits; fights standard autosave expectations                                   |
| IndexedDB + sync engine                            | Wrong scale; the server import draft already provides resume                                      |
| Split GET meta / rows APIs now                     | Extra round-trip without pagination need; revisit later                                           |
| Zustand draft store                                | Violates server-state-via-Query convention; duplicates the collection                             |

## Consequences

- TanStack DB (beta accepted for this surface) backs the review session; the hub remains Query-only.
- Flush-before-Continue is a hard prerequisite for trusting import set verification.
- If TanStack DB drops optimistic state when a `mutationFn` throws, adapt the persistence adapter so product behavior stays keep-edits-and-retry.
- No new glossary terms for “working copy” or “session”. Domain language stays **Import draft** / **Review import** / **Reviewed import value** / **Import finalize preview** / **Import history** in `CONTEXT.md`.
