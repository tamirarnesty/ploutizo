---
status: accepted
---

# Import review working copy

During **Review import**, the UI must feel instant while still persisting corrections onto the durable **import draft** so drafts remain resumable. Hand-rolled React Query cache surgery plus per-field local state created multiple write paths, overlapping PATCHes, and rollback that could clobber unrelated successful edits. We need one client working copy and paced persistence without inventing a custom sync engine.

## Decision

### Authority

| Layer                              | Role                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres via API                   | Durable **import draft** — resumable across sessions                                                                                                                            |
| TanStack DB rows `queryCollection` | Session working copy while review is mounted — only place components write row data                                                                                             |
| Slim TanStack Query (draft meta)   | Account, file name, batch status, and other non-row context                                                                                                                     |
| Controlled inputs                  | Presentation only — never a second store or authority                                                                                                                           |
| **Import row status** / counts     | Derived from the collection during the session (presentation). Server **import set verification** remains authoritative at Continue (import readiness ADR on the review stack). |

Hub create / discard / list stay on TanStack Query and are **outside** the working-copy contract.

### Session boundary

Working-copy rules apply only while `/transactions/import/$draftId` is mounted and the draft is still active. Leaving review ends the session contract (cache/collection may stay warm in memory, but editing authority ends). Returning to review re-hydrates from GET (or warm data + reconcile). Hub ↔ review navigation does **not** extend the working-copy lifecycle.

### Shape: rows collection + meta query

- **Rows:** `queryCollection` keyed by row id, loaded for one `draftId`.
- **Meta:** slim Query for draft header context — not a second editable store.
- **Rejected:** keeping a nested `ImportDraft.rows[]` blob in React Query as the live edit model (two truths).

### Hydration

Keep a single `GET /drafts/:id` that returns meta + rows. The client splits on load: seed the rows collection from `rows`, set the meta query from the rest. Do **not** split the API into meta + rows endpoints until pagination or payload size requires it. Query dedupes if meta and collection `queryFn`s share the same fetch.

```text
GET /drafts/:id
  → seed importDraftRows collection (getKey: row.id)
  → set draft meta query (no live row edits here)
```

### Write path (one surface)

All review cells — text, discrete picks, tags, selection — update the collection only. No detours through `patchImportDraftCache`, per-field React authority, or direct `setQueryData` for row edits.

Conceptual shape (implementation may vary; contract must not):

```tsx
// Shared per-row paced instance (factory keyed by rowId)
const mutateRow = getRowPacedMutations(rowId) // createPacedMutations + debounceStrategy

// Discrete or text — same API
mutateRow({
  patch: { reviewCategoryId: id }, // or reviewDescription, etc.
})

// onMutate (immediate):
importRowsCollection.update(rowId, (draft) => {
  Object.assign(draft, patch)
})

// after debounce settle — mutationFn:
// PATCH /api/imports/rows/:rowId with merged diff since last persisted
```

Components call `mutate({ patch })` / collection update helpers only. They do not choose “local vs cache vs API.”

### Persistence pacing

| Rule             | Choice                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Strategy         | `debounceStrategy` (TanStack DB paced mutations)                                                                  |
| Wait             | **500ms** — TanStack auto-save default; UX consensus for typed input                                              |
| Text vs discrete | **Same delay and same path** — dual delays rejected as complexity without payoff for single-user review           |
| Queue scope      | **Per row** (`createPacedMutations` per `rowId`) so edits on row A never block or incorrectly coalesce with row B |
| Merge            | Rapid patches on the same row merge into one transaction / one PATCH of the settled diff                          |
| PATCH body       | Diff of changed fields (validator-shaped partial), not necessarily every column on the row                        |

`usePacedMutations` per cell without a shared factory creates **isolated queues** — wrong for a grid. Use **`createPacedMutations` per row**, shared across cells of that row.

### Selection (hybrid)

1. Checkbox / select-all updates `selectedForImport` on the **collection** immediately (same working copy).
2. Persist select-all (and multi-id selection) via the existing **bulk selection** endpoint as an optimization in `mutationFn`.
3. Single-row selection may use the same bulk endpoint with one id or the row PATCH; either way the UI still writes the collection first.
4. Flush pending per-row paced field persists before running bulk selection persist when ordering matters (e.g. before Continue).

Rejected: selection-only path that bypasses the collection; select-all as N independent row PATCHes with no bulk optimization.

### Autosave UX (standard patterns)

| Concern                 | Behavior                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Status surface          | **Draft-level** strip: Saving → Saved → Failed · Retry                                                                            |
| Persist failure         | **Keep collection edits** — do not roll back the working copy                                                                     |
| Retry                   | Re-persist current collection diff; further edits reset the debounce and may succeed on their own                                 |
| Row failure signal      | Optional status icon + explanation on the row (same presentation family as ready / needs review) — **not** a second retry control |
| Continue / in-app leave | Flush pending paced work; **block** leave or Continue if flush fails or Failed remains                                            |
| Tab close / refresh     | Best-effort flush (`visibilitychange` / `beforeunload`); warn when pending or failed — browsers cannot reliably await             |

If TanStack DB’s default is to drop optimistic state when `mutationFn` throws, adapt the persistence adapter so product behavior stays keep-edits-and-retry (beta API constraint, not a product compromise).

### Sequencing

1. **Done / hotfix:** scoped React Query rollback + freshness guards on the current per-field PATCH path — stops clobbering; **not** the destination.
2. **Next:** migrate review row editing to collection + paced mutations; remove dual field authority and draft-wide cache restore.
3. **Then:** wire Continue / finalize against a coherent working copy and flush contract.

Do not enable Continue while the dual-layer RQ + local-field model is still the edit path.

## Considered options

| Option                                             | Rejected / deferred because                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| RQ nested `ImportDraft` as long-term working copy  | Manual merge/rollback; encourages second local buffer; caused whole-draft restore clobber               |
| Local field state as authority for text            | Multi-truth; flush rules; keep only as short-lived input chrome if a widget requires it, never as store |
| Cache-on-every-keystroke into RQ                   | Grid rerender cost; still leaves persistence policy hand-rolled                                         |
| Dual debounce (short discrete / long text)         | Minor UX gain; extra factory branching — single 500ms is enough                                         |
| Per-row TanStack Query `mutationKey` only          | Patch on per-field PATCH design; subsumed by paced merge + per-row queues                               |
| Draft-level single paced queue                     | Cross-row edits block or coalesce incorrectly                                                           |
| Full-row blind server merge on success             | Clobbers in-flight fields; prefer merged paced diff / scoped apply                                      |
| Working-copy rollback on PATCH failure             | Forces re-entry of edits; fights standard autosave expectations                                         |
| Linear-style IndexedDB + sync engine               | Wrong scale; server **import draft** already provides resume                                            |
| Custom `Map<rowId, RowEditState>` + Query debounce | Reinvents paced mutations                                                                               |
| Split GET meta / rows APIs now                     | Extra round-trip without pagination need — revisit later                                                |
| Zustand draft store                                | Violates server-state-via-Query convention; duplicates collection                                       |

## Consequences

- Add TanStack DB (beta accepted for this surface) under the web app’s import review data layer; hub remains Query-only.
- `patchImportDraftCache` and `useImportRowFieldState`-as-authority are transitional; delete once the collection path owns review edits.
- ADR / PR text should describe hotfix vs destination so reviewers do not treat scoped RQ helpers as the final design.
- Flush-before-Continue is a hard prerequisite for import set verification trust.
- No new domain glossary terms for “working copy” — domain language stays **Import draft** / **Review import** / **Reviewed import value** in `CONTEXT.md`.
