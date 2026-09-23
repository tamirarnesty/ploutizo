# TanStack Table v9 / ReUI data-grid migration findings

**Scope:** repository research only, performed 2026-09-15. No source, manifest, or lockfile changes are included in this note.

## Recommendation

Replace the managed ReUI `data-grid` primitive from the current registry first, then migrate the four web table assemblies to its `dataGridFeatures` contract. Do not hand-port the installed v8-oriented files: the current ReUI registry component is explicitly a TanStack Table v9 grid and ships `dataGridFeatures` plus the v9 generics consumers need. [ReUI Data Grid docs][reui-data-grid]

Use the current ReUI registry implementation as the v9 base. Before replacement, inventory every local behavior and deliberately evaluate the registry default against its current behavior. Preserve required behavior through a consumer wrapper or usage-site configuration first. When that boundary cannot express it, directly adapt the local ReUI files after the registry refresh; these generated files are intentionally local source, not an upstream contribution.

## Primary sources

1. [TanStack Table React migration guide][tanstack-migration] — current upstream `main` documentation supplied for this research.
2. [ReUI Data Grid documentation][reui-data-grid] — current first-party registry API retrieved through the ReUI MCP.
3. [ReUI Data Grid component preview][reui-preview] and [official pagination example][reui-pagination-example] — visual/usage references for the managed component.

## Confirmed migration rules

- `useReactTable` is renamed to `useTable`, and v9 requires a `features` option. The core row model is always included; feature row models are registered via `tableFeatures(...)`, not as `useTable` options. [TanStack: hook rename and features][tanstack-migration]
- ReUI's current data-grid contract supplies `dataGridFeatures`; the intended consumer shape is `useTable({ features: dataGridFeatures, data, columns })`, and its table-related types have `DataGridFeatures` as their first generic. [ReUI Data Grid docs][reui-data-grid]
- The current ReUI grid registers a paginated row model. Any renderer intended to display every supplied row (not page only) must opt out with `manualPagination: true`; a server-paged grid must also pass `rowCount` or `pageCount` for correct page controls. [ReUI Data Grid docs][reui-data-grid]
- v9 moves table state from `table.getState()` to `table.state` (or `table.store.state`). Existing controlled `state` plus individual `on[Slice]Change` handlers remain supported. [TanStack: state access and controlled state][tanstack-migration]
- `ColumnDef`, `Column`, `Table`, `Row`, `Cell`, `Header`, and `HeaderGroup` gain a leading `TFeatures` generic. Global `ColumnMeta` augmentation also gains that parameter, although v9 supports per-feature metadata instead. [TanStack: TypeScript changes][tanstack-migration]
- `sortingFn` becomes `sortFn`; the repository has one custom sorter in the card-balances columns. [TanStack: sorting][tanstack-migration]
- Column pinning moves from physical `left` / `right` to logical `start` / `end`, with no aliases. This applies to state, `column.pin`, `getIsPinned`, table/row APIs, CSS selectors, and sticky positioning. [TanStack: column pinning][tanstack-migration]
- Column sizing and resizing are split. `columnSizingInfo`, `setColumnSizingInfo`, and `onColumnSizingInfoChange` become `columnResizing`, `setColumnResizing`, and `onColumnResizingChange`. [TanStack: sizing and resizing][tanstack-migration]
- Methods on row/cell/column/header objects must retain their instance receiver; do not destructure them into bare callbacks. `flexRender` itself remains supported. [TanStack: instance methods and rendering][tanstack-migration]

## Dependency inventory

Both direct consumers declare `@tanstack/react-table` `^8.21.3`:

- `packages/ui/package.json`
- `apps/web/package.json`

The migration must update them together and verify the lockfile resolves no v8 copy. This is intentionally not included in the current research change.

## File-by-file migration inventory

### Replace through the ReUI registry

| File(s)                                                                     | Current v8/custom behavior                                                                                                                            | Migration concern                                                                                                                                                             |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/components/reui/data-grid/data-grid.tsx`                   | Global `ColumnMeta` augmentation; `Table<TData>` context; reads `getState()`; mutates `table.options.columnResizeMode`.                               | Replace with the registry version. Reconcile `grow`, `skeleton`, and `expandedContent` metadata with the current ReUI per-feature metadata API.                               |
| `packages/ui/src/components/reui/data-grid/data-grid-table.tsx`             | v8 generics; `getState`; `columnSizingInfo`; custom pointer resize; `left`/`right` pinning and physical CSS selectors; expanded rows; CSS width-fill. | High-risk replacement. The current registry uses v9 logical pin attributes and its own resize/render implementation; do not mechanically rename this 1,500-line file.         |
| `packages/ui/src/components/reui/data-grid/data-grid-column-header.tsx`     | v8 `Column`; `getState`; `pin('left'/'right')`; labels and controls tied to physical pin values.                                                      | Replace/reconcile with current registry header controls; preserve product copy only if still needed.                                                                          |
| `packages/ui/src/components/reui/data-grid/data-grid-column-filter.tsx`     | v8 `Column`, faceted value display.                                                                                                                   | Replace/reconcile. The registry requires the faceting feature and an explicitly available filter function for filtering to take effect. [ReUI Data Grid docs][reui-data-grid] |
| `packages/ui/src/components/reui/data-grid/data-grid-column-layout.ts`      | v8 `Table`; the local `meta.grow` width-fill helper.                                                                                                  | Replace or adapt only if an equivalent registry hook is absent.                                                                                                               |
| `packages/ui/src/components/reui/data-grid/data-grid-column-visibility.tsx` | v8 `Table` generic.                                                                                                                                   | Update/reconcile type signature.                                                                                                                                              |
| `packages/ui/src/components/reui/data-grid/data-grid-pagination.tsx`        | reads `table.getState().pagination`.                                                                                                                  | Registry replacement should move it to the v9 state surface.                                                                                                                  |
| `packages/ui/src/components/reui/data-grid/data-grid-table-virtual.tsx`     | v8 `Table`/`Row`/`HeaderGroup`; resize memo predicate reads `columnSizingInfo`.                                                                       | Replace/reconcile even though no current web consumer imports it.                                                                                                             |
| `packages/ui/src/components/reui/data-grid/data-grid-table-dnd.tsx`         | v8 `Cell`/`Header`/`Row`; `getState()` for pagination and column order.                                                                               | Replace/reconcile even though no current web consumer imports it.                                                                                                             |
| `packages/ui/src/components/reui/data-grid/data-grid-table-dnd-rows.tsx`    | v8 `Cell`/`HeaderGroup`/`Row`; `getState()` pagination.                                                                                               | Replace/reconcile even though no current web consumer imports it.                                                                                                             |
| `packages/ui/src/components/reui/data-grid/data-grid-scroll-area.tsx`       | Custom Base UI scrolling/sticky-header scrollbar.                                                                                                     | No direct v8 API call, but a registry overwrite may replace this customized behavior; visually regress sticky import-review scrolling after migration.                        |

### Migrate web consumers and shared types

| File                                                                           | Current behavior                                                                                                         | Required v9 work                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/transactions/TransactionsTable.tsx`                   | Server-paginated/sorted; direct `useReactTable` and `getCoreRowModel`; already passes `manualPagination` and `rowCount`. | Use `useTable` + `dataGridFeatures`; remove core row-model option; retain manual pagination, sorting state handlers, and `rowCount`.                                                                                    |
| `apps/web/src/components/accounts/AccountsTable.tsx`                           | Client pagination; direct `useReactTable`, core and pagination row models; `ColumnDef<Account>[]`.                       | Use `dataGridFeatures`; remove row-model options; update the column definition to `ColumnDef<DataGridFeatures, Account>[]`. Do **not** add `manualPagination`, or the account grid will stop slicing client-side pages. |
| `apps/web/src/components/dashboard/card-balances/CardBalancesGrid.tsx`         | Client sorting/pagination; direct v8 row-model options; `SortingState`.                                                  | Use `dataGridFeatures`; remove row-model options; retain controlled sorting/pagination.                                                                                                                                 |
| `apps/web/src/components/dashboard/card-balances/buildCardBalancesColumns.tsx` | `ColumnDef<CardBalanceRowViewModel>[]`; custom `sortingFn` for due dates.                                                | Add `DataGridFeatures` generic and rename `sortingFn` to `sortFn`.                                                                                                                                                      |
| `apps/web/src/components/transactions/TransactionColumns.tsx`                  | `ColumnDef<TransactionRow>[]`; ReUI header component.                                                                    | Add `DataGridFeatures` generic.                                                                                                                                                                                         |
| `apps/web/src/components/imports/review/ImportDraftReviewTable.tsx`            | Client pagination/expansion; `columnPinning: { left: ['selection'] }`; v8 row-model options.                             | Use `dataGridFeatures`; remove row-model options; change state to `{ start: ['selection'], end: [] }`; verify the pinned selection column and sticky header in LTR and RTL.                                             |
| `apps/web/src/components/imports/review/buildImportReviewColumns.tsx`          | `ColumnDef<ImportDraftRow>[]`; `enablePinning`.                                                                          | Add `DataGridFeatures` generic; replace with the v9 column-pinning option appropriate to the finalized registry/table feature API.                                                                                      |
| `apps/web/src/components/dashboard/card-balances/RightAlignedColumnHeader.tsx` | `Column<TData, TValue>`.                                                                                                 | Add the leading `DataGridFeatures` generic.                                                                                                                                                                             |
| `apps/web/src/hooks/persistedPageSize.ts`                                      | `PaginationState` and `Updater<PaginationState>` only.                                                                   | Confirm type aliases remain import-compatible after dependency update; no feature generic is expected for state aliases.                                                                                                |
| `apps/web/src/components/imports/lib/useImportDraftReviewState.ts`             | `PaginationState` and `Updater<PaginationState>` only.                                                                   | Same compatibility check as `persistedPageSize.ts`.                                                                                                                                                                     |

## Current customization and regression risks

1. **Registry overwrite versus local implementation.** The current `packages/ui` grid is not a stock registry copy: it contains custom CSS-variable sizing/fill, a manual `onEnd` pointer/touch resize flow, expandable rows via metadata, pinned row rendering, a custom scroll-area scrollbar, and custom header controls. ReUI's current registry has broader v9 features, but its public metadata and DOM contracts differ. Treat the registry as the new base and compare its actual installed output before carrying any customization forward.
2. **Pinning is the highest behavior risk.** The import-review grid currently pins `selection` to the left and the primitive has many physical `left`/`right` CSS branches. A partial rename can compile yet break sticky edge borders, RTL behavior, or resize-handle masking.
3. **Pagination behavior must stay per grid.** The transactions table is server-paged and needs `manualPagination` plus `rowCount`; accounts, card balances, and import review are client-paged and must retain the registry's paginated model.
4. **Customization boundary.** The preferred boundary is a consumer wrapper or usage-site configuration. When that cannot express a verified required behavior, modify the local ReUI source after the registry refresh. Record the divergence and its verification evidence so a future registry update can reevaluate it.
5. **Do not choose `stockFeatures` by default.** It can reduce initial migration edits, but it includes all features and forfeits v9's tree-shaking benefit. The registry already provides a feature bundle tuned for its data grid. [TanStack: `stockFeatures`][tanstack-migration]
6. **Global metadata should not silently survive.** The installed primitive augments `ColumnMeta` globally. The registry’s feature-scoped `DataGridFeatures` approach avoids leaking grid-only metadata to unrelated tables; decide the metadata boundary before preserving `grow`, skeleton, and expanded-row contracts. [TanStack: table and column meta][tanstack-migration]

## Ploutizo fork capabilities

Capabilities added or changed locally in `packages/ui/src/components/reui/` (reconcile after `npx shadcn@latest add @reui/data-grid`):

- **`DataGrid.renderRowContextMenu`** — Optional `(row) => ReactNode` menu content; `data-grid-row-context-menu.tsx` wraps the table viewport in a single context menu, registers the TanStack row from body and expanded `<tr>` `onContextMenu`, and cancels open when no row was registered (e.g. header right-click).

## Verification checklist

### Static and dependency checks

- [ ] Update both direct manifests in one change, reinstall, and confirm every `@tanstack/react-table` resolution is v9.
- [ ] Replace the ReUI data-grid from the registry command reported by the registry: `npx shadcn@latest add @reui/data-grid`.
- [ ] Confirm no source uses `useReactTable`, `getCoreRowModel`, `getPaginationRowModel`, `getSortedRowModel`, `getExpandedRowModel`, `table.getState()`, `columnSizingInfo`, `sortingFn`, `pin('left'/'right')`, or `data-pinned=left/right`.
- [ ] Confirm every `ColumnDef`, `Column`, `Table`, `Row`, `Cell`, `Header`, and `HeaderGroup` associated with the grid supplies `DataGridFeatures`.
- [ ] Run `pnpm turbo typecheck`, `pnpm turbo lint`, and the repository-wide format checks documented in `AGENTS.md`.

### Behavior checks

- [ ] Transactions: server sorting, next/previous page, page-size change, total-page count, loading skeleton, column resize, and width-fill.
- [ ] Accounts: client-side sorting behavior (where enabled), client pagination, persisted page size, row click, and empty/loading states.
- [ ] Card balances: due-date custom sort in both directions, client pagination, footer total, and dense layout.
- [ ] Import review: expansion, selection controls, pinned selection column while horizontally scrolling, sticky header/vertical scrollbar, page-size changes, and focus-row scroll.
- [ ] Cross-grid: column visibility, pin/unpin start and end, resize in `onEnd`, screen-reader labels, keyboard interaction, and RTL pinning if supported by product locales.
- [ ] Visually compare the above with current production/branch screenshots, focusing on sticky column boundaries, resize feedback, and header/body z-index layering.

## Agreed implementation decisions

1. **Controlled default adoption:** establish current behavior, then test each v9/ReUI default one behavior at a time. Keep the old behavior only when the evidence shows it remains required; otherwise adopt the new default.
2. **Verification evidence:** every decision records baseline behavior, v9 default observed, keep/adopt decision, and automated plus browser evidence. The checklist explicitly covers local scrollbar, resize, width-fill, expansion, sticky-header, pinning, pagination, selection, and viewport behavior.
3. **Customization boundary:** start with a consumer wrapper or usage-site configuration. If that cannot express a verified required behavior, directly modify the local ReUI source after the registry refresh.
4. **Feature and metadata contract:** use the registry `dataGridFeatures` bundle and its feature-scoped metadata types for every existing grid; do not preserve the v8 global `ColumnMeta` augmentation.
5. **Migration sequencing:** deliver the registry refresh, both direct dependency upgrades, every grid consumer migration, and the behavior checklist as one atomic change. Create separate follow-up issues only for intentional UX improvements identified by the checklist.

[tanstack-migration]: https://raw.githubusercontent.com/tanstack/table/main/docs/framework/react/guide/migrating.md
[reui-data-grid]: https://reui.io/docs/components/base/data-grid?ref=mcp
[reui-preview]: https://reui.io/components/data-grid?ref=mcp
[reui-pagination-example]: https://reui.io/preview/base/components/c-data-grid-1?ref=mcp
