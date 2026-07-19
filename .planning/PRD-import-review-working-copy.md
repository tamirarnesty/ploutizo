# Spec: Import review working copy

> Status: **ready-for-agent** — synthesized from grill session + ADR 0005 (July 2026).
> Domain glossary: `CONTEXT.md`.
> Architecture: `docs/adr/0005-import-review-working-copy.md` (accepted). Related: `docs/adr/0004-import-readiness-and-finalize-preparation.md`.
> Parent feature: `.planning/PRD-credit-card-csv-import.md`.
> Hotfix already landed on the import web data stack (scoped React Query rollback). This spec is the **destination migration** for **Review import** editing.

## Problem Statement

During **Review import**, household members correct **reviewed import values**, choose **selected import rows**, and expect those changes to stick when they leave and resume the durable **import draft**. Today the review UI can feel fast, but persistence is fragmented: React Query holds a nested draft blob, some fields use local React state as a second authority, and each edit may fire its own PATCH. Overlapping updates have already produced rollback races that hide successfully saved corrections until a refetch catches up—or leave the UI wrong while offline or delayed.

Users experience this as “I fixed this row, then something else failed and my fix disappeared” or as uncertainty about whether the draft on resume will match what they just edited. Standard autosave expectations (instant UI, quiet background save, clear Saving / Saved / Failed · Retry, keep my edits when save fails) are not met by the current dual-layer model.

## Solution

Make **Review import** use a single client working copy for editable rows while the review route is mounted: a TanStack DB rows collection hydrated from the existing draft GET. Every cell writes only that collection. Persistence is paced per row (~500ms debounce) so rapid edits merge into one PATCH of the settled diff. Bulk selection still updates the collection first, then persists through the bulk selection API. Draft metadata stays in a slim Query. A draft-level autosave strip shows Saving / Saved / Failed · Retry; failed persists keep edits and allow retry. Leaving review or pressing Continue flushes pending work and blocks when flush fails. Resume still comes from the server **import draft**—not a browser sync engine.

Scoped React Query rollback helpers remain a temporary hotfix only; they must not be treated as the long-term design. Continue / **Finalize import** must not be enabled until this working-copy model owns review edits and flush-before-verify is in place (ADR 0004).

## User Stories

1. As a household member, I want my **reviewed import values** to appear instantly when I edit a cell, so that **Review import** never waits on the network to feel responsive.
2. As a household member, I want corrections I make during **Review import** to save onto the **import draft** without me pressing Save, so that I can work through a statement without a manual commit step.
3. As a household member, I want to leave **Review import** and later resume the same **import draft**, so that I see the last successfully persisted corrections and selections.
4. As a household member, I want typing in description, notes, or amount to not hammer the server on every keystroke, so that the app stays smooth and network-friendly.
5. As a household member, I want changing category, type, assignee, date, or tags to use the same save path as text fields, so that I do not have to learn different save behaviors per control.
6. As a household member, I want rapid edits on one row to coalesce into a single persisted update, so that intermediate keystrokes or picks do not create conflicting saves.
7. As a household member, I want editing row A never to delay or corrupt saves for row B, so that I can work down the grid freely.
8. As a household member, I want a clear draft-level Saving / Saved indicator, so that I know the **import draft** is catching up to my edits.
9. As a household member, I want a Failed · Retry control at the draft level when a save fails, so that I can re-persist without redoing my edits.
10. As a household member, I want my in-progress corrections to remain visible when a save fails, so that I never lose work to an automatic rollback.
11. As a household member, I want further edits after a failed save to try persisting again automatically, so that a transient network blip can clear without a special ritual.
12. As a household member, I want a row-level status cue when that row’s persist failed, so that I can find which line needs attention without hunting a second retry button.
13. As a household member, I want selecting or deselecting rows for the **import set** to update the grid immediately, so that selection feels as responsive as field edits.
14. As a household member, I want select-all on the current page to persist efficiently, so that bulk selection does not fire dozens of independent row requests when a bulk API exists.
15. As a household member, I want pending field saves to finish before bulk selection is persisted when order matters, so that the **import draft** does not record selection against stale reviewed values.
16. As a household member, I want **import row status** chips and counts to reflect what I currently see in the grid, so that readiness feedback matches my edits before Continue.
17. As a household member, I want Continue to wait until pending saves succeed, so that **import set verification** runs against the values I actually intended.
18. As a household member, I want navigation away from **Review import** to flush pending saves when possible, so that soft leaves do not drop the last quiet-period edits.
19. As a household member, I want to be blocked or warned when I try to leave with a failed or still-pending save, so that I do not accidentally abandon unpersisted corrections.
20. As a household member, I want a best-effort save warning when I close or refresh the tab with pending work, so that hard exits match common autosave apps even if the browser cannot await the request.
21. As a household member on the **Import hub**, I want create, resume, discard, and history to keep working as they do today, so that the working-copy redesign does not change hub behavior.
22. As a household member opening a draft from the hub, I want review to load account and file context plus all rows from one draft fetch, so that resume stays snappy.
23. As a household member, I want draft header context (account, file name, batch status) to remain visible while I edit rows, so that I always know which **import draft** I am reviewing.
24. As a household member, I want invalid rows to stay non-editable where they already are, so that the new save model does not invent editability for unparseable lines.
25. As a household member, I want skipped (unselected) rows to remain outside the **import set** while still accepting field corrections if the product already allows them, so that selection and field persistence stay independent concerns.
26. As a household member, I want tags and assignee changes to persist through the same paced path as other reviewed fields, so that refinements are not a special-case save.
27. As a household member experiencing a slow network, I want the grid to keep showing my latest local corrections while saves catch up, so that latency never blanks or reverts cells I just changed.
28. As a household member who changes category then immediately edits description on the same row, I want both changes to land in the persisted **reviewed import values**, so that neither edit is lost to racey per-field PATCHes.
29. As a household member who changes the same field twice quickly, I want only the final value to persist, so that an older failed attempt cannot overwrite a newer success.
30. As a household member returning to review after a failed save that I retried successfully, I want resume to show the retried values from the server **import draft**, so that durability matches what Saved promised.
31. As a developer maintaining imports, I want review cells to call one write API into the working copy, so that new columns do not invent a third persistence path.
32. As a developer, I want hub list mutations to stay on TanStack Query, so that the collection working copy stays scoped to mounted **Review import**.
33. As a developer, I want transitional React Query draft-blob patch helpers removed after migration, so that the hotfix model cannot be extended by accident.
34. As a developer, I want Continue / finalize work to depend on flush + server **import set verification**, so that client **import row status** is never mistaken for eligibility authority (ADR 0004).
35. As a reviewer of the import stack, I want the hotfix PR and this destination clearly separated, so that scoped rollback is not mistaken for the final architecture.

## Implementation Decisions

### Architecture (ADR 0005)

1. **Session boundary:** Working-copy rules apply only while the review route for an active **import draft** is mounted. Hub navigation does not extend the session. Remount re-hydrates from GET (warm cache may reconcile in the background).
2. **Authority:**
   - Server / Postgres via API = durable **import draft** (resume truth).
   - TanStack DB rows `queryCollection` = session working copy for editable rows.
   - Slim TanStack Query = draft metadata only (account, file name, batch status, etc.).
   - Controlled inputs = presentation only, never a second store.
   - **Import row status** and counts = derived presentation from the collection during the session; Continue still uses server **import set verification**.
3. **Hydration:** Keep one `GET` draft response that includes meta + rows. Client splits: seed the rows collection; set the meta query. Do not split the HTTP API until pagination or payload size requires it.
4. **One write surface:** All review cells (text, discrete picks, tags, selection) update the collection only. No nested React Query draft-blob edits and no local-field authority for persistence.
5. **Paced persistence:** Per-row `createPacedMutations` with a single `debounceStrategy` wait of ~500ms for text and discrete fields. Rapid same-row patches merge; PATCH body is the validator-shaped diff of changed fields. Shared factory per row so cells share one queue (isolated per-cell hooks are wrong for a grid).
6. **Selection (hybrid):** Update `selectedForImport` on the collection immediately; persist multi-id selection via the existing bulk selection endpoint as an optimization. Flush pending per-row field persists before bulk selection persist when ordering matters (e.g. before Continue).
7. **Autosave UX:** Draft-level Saving → Saved → Failed · Retry. On persist failure, **keep** collection edits (no working-copy rollback). Retry re-persists current collection state; further edits may auto-retry. Optional row status icon + explanation for failed row persist; retry remains on the draft strip. Adapt TanStack DB adapters if default optimistic drop-on-throw conflicts with keep-edits-and-retry.
8. **Leave / Continue:** Flush pending paced work; block in-app leave and Continue if flush fails or Failed remains. Tab close / refresh: best-effort flush + warn when pending or failed.
9. **Sequencing:** (1) Scoped RQ hotfix — done. (2) Migrate review editing to collection + paced mutations; remove dual authority. (3) Then enable Continue / finalize against flush + verification. Do not wire Continue on the dual-layer model.
10. **Hub:** Create, discard, list, history remain Query-only and outside the working-copy contract.
11. **Dependencies:** TanStack DB is accepted as a beta dependency for this surface.
12. **Domain language:** No glossary term for “working copy.” Use **Import draft**, **Review import**, **Reviewed import value**, **Import set**, **Import row status** per `CONTEXT.md`.

### Conceptual write contract (from ADR; contract must hold even if APIs rename)

```text
UI cell change
  → per-row paced mutate({ patch })
  → onMutate: collection.update(rowId, apply patch)   // immediate
  → debounce ~500ms (merge rapid patches on that row)
  → mutationFn: PATCH row (diff) or bulk selection API
  → success: reconcile synced state; failure: keep local, mark Failed
```

### Modules / interfaces (logical)

- Review-session working-copy module: hydrate from draft GET, expose live rows + meta, accept row patches and selection updates, expose autosave status, flush.
- Per-row paced persistence factory shared by grid cells.
- Review UI grid/cells: call only the working-copy write API; remove local-field-as-authority and direct cache patch usage after migration.
- Existing import draft GET, row PATCH, and bulk selection PATCH contracts stay; no schema migration required for this spec.
- Transitional React Query nested-draft patch/rollback helpers: delete once unused.

### Rejected approaches (do not revisit without new evidence)

- Nested React Query `ImportDraft` as long-term working copy
- Local field state as persistence authority
- Dual debounce strategies for text vs discrete
- Draft-level single paced queue (cross-row blocking)
- Working-copy rollback on PATCH failure
- Linear-style IndexedDB sync engine for v1
- Custom row-model Map reinventing paced mutations
- Split GET meta/rows APIs as a prerequisite
- Zustand draft store for server-shaped rows

## Testing Decisions

### What makes a good test

Test observable behavior of the review working-copy seam: after hydrate and user-visible actions (edit, select, flush, fail, retry, leave), assert live row values, autosave status, and which persistence calls were made (or their merged outcomes)—not internal TanStack DB/Query cache shapes or helper function names.

### Primary seam (prefer one)

**Review-session working-copy façade** (highest seam):

- Input: draft GET payload; row patch / selection commands; flush / retry / leave signals.
- Output: live rows for the grid; draft meta; autosave status (Saving / Saved / Failed); persistence side effects against existing row PATCH and bulk selection APIs; block/allow Continue and in-app leave.

Avoid adding a second seam around transitional React Query cache helpers except for keeping hotfix regression tests green until those helpers are deleted.

### Behaviors to cover at that seam

1. Hydrate splits meta vs rows; grid reads collection values.
2. Discrete and text edits update live rows immediately; persistence waits ~500ms and merges same-row bursts into one diff PATCH.
3. Edits on row A do not coalesce with or block row B.
4. Failed persist keeps live edits; status → Failed; retry (or next edit) re-persists current state without rollback.
5. Newer same-row value is not overwritten by an older failed attempt (destination: merge/queue; hotfix regressions may remain until helpers die).
6. Selection updates collection first; bulk persist uses bulk API; flush-before-selection/Continue ordering holds when required.
7. Continue / in-app leave blocked while pending or Failed; successful flush allows proceed.
8. Hub create/discard/list unaffected (outside seam).

### Prior art

- Import draft cache helper tests (hotfix regressions for scoped rollback / freshness)—retain until migration deletes helpers.
- Import review UI tests on the review stack (selection, flush-before-select-all, continue gating)—extend or rewire to the new façade rather than inventing parallel suites.
- Broader import PRD / API route tests cover server durability; this spec’s tests focus on client session behavior against those APIs (mocked at the network boundary).

## Out of Scope

- **Finalize import**, prepared import set UI, and bulk transaction creation (separate readiness / finalize work; ADR 0004).
- Enabling Continue while the dual-layer RQ + local-field model remains the edit path.
- Bank-specific CSV parsers, merchant rules during import, match/duplicate resolution UI, refund linker UI, settlement **Pay toward** review fields.
- Offline-first IndexedDB sync, multi-tab realtime collaboration, Electric/PowerSync.
- Splitting draft GET into separate meta and rows HTTP endpoints (deferred until needed).
- Changing hub upload / discard / history product behavior.
- Adding “working copy” as a `CONTEXT.md` glossary term.
- Redesigning the review DataGrid chrome beyond what the new write/persist model requires.

## Further Notes

- Parent CSV import PRD remains the product umbrella; this spec is the client persistence/working-copy slice for **Review import** only.
- Product copy and domain language must stay aligned with `CONTEXT.md`: mid-review corrections persist on the **import draft** as **reviewed import values**; resume continues from last persisted state.
- If TanStack DB beta APIs make keep-edits-on-failure awkward, adapt the persistence adapter—do not weaken the autosave UX contract.
- Suggested delivery order for agents: introduce collection + paced façade behind review → migrate cells off local authority and RQ blob patches → draft-level autosave strip + flush gates → delete transitional cache helpers → only then Continue.
