# 002 — Key data-grid headers by TanStack id

- **Status**: DONE
- **Commit**: 7eae72e
- **Severity**: HIGH
- **Category**: Bugs & correctness
- **Rule**: react-doctor/no-array-index-as-key
- **Estimated scope**: 4 files, key props only

## Problem

Data-grid header rows and header cells use the `.map` index as `key`. Transactions, accounts, imports, and the dashboard all render through this grid, and columns can be reordered, hidden, and resized. An index key reuses the previous column's cell instance for whatever column slides into that slot.

Body rows already use `row.id`, and `DataGridTableDnd` header cells already use `header.id`. These sites do not:

```tsx
// packages/ui/src/components/reui/data-grid/data-grid-table.tsx:1192 and :1246
.map((headerGroup: HeaderGroup<TData>, index) => {
  return (
    <DataGridTableHeadRow headerGroup={headerGroup} key={index}>
      {headerGroup.headers.map((header, index) => {
        return (
          <DataGridTableHeadRowCell header={header} key={index}>

// packages/ui/src/components/reui/data-grid/data-grid-table-dnd.tsx:230
<DataGridTableHeadRow headerGroup={headerGroup} key={index}>

// packages/ui/src/components/reui/data-grid/data-grid-table-dnd-rows.tsx:235 and :240
<DataGridTableHeadRow headerGroup={headerGroup} key={index}>
  <DataGridTableHeadRowCell header={header} key={index}>

// packages/ui/src/components/reui/data-grid/data-grid-table-virtual.tsx:418 and :423
<DataGridTableHeadRow headerGroup={headerGroup} key={index}>
  <DataGridTableHeadRowCell header={header} key={hIndex}>
```

The same drag-row renderer also keys live body cells by column position:

```tsx
// packages/ui/src/components/reui/data-grid/data-grid-table-dnd-rows.tsx:131
<DataGridTableBodyRowCell cell={cell} key={colIndex}>
```

`colIndex` is the same bug with a name the scanner does not flag. TanStack's stable ids are `headerGroup.id`, `header.id`, and `cell.id`. The non-drag body already uses `key={cell.id}` at `data-grid-table.tsx:960`.

`DataGridTableDndRow` also builds a new context object every render (`jsx-no-constructed-context-values` at line 122):

```tsx
<SortableRowContext.Provider value={{ attributes, listeners }}>
```

## Target

Canonical recipe (`react-doctor/no-array-index-as-key`): `key={item.id}` for an id that survives reorder. Canonical recipe (`react-doctor/jsx-no-constructed-context-values`): memoize the object and pass the identifier.

- Header group: `key={headerGroup.id}`. Drop the unused index parameter.
- Header cell: `key={header.id}`. Drop `index` / `hIndex`.
- Live drag-row cell at line 131 only: `key={cell.id}`. Leave every `Array.from({ length })` skeleton (`key={rowIndex}`, `key={colIndex}` on skeleton cells) unchanged. Those lists are positional placeholders.
- Drag-row context, `useMemo` is already imported in `data-grid-table-dnd-rows.tsx`:

```tsx
const rowContextValue = useMemo(
  () => ({ attributes, listeners }),
  [attributes, listeners]
);

return (
  <SortableRowContext.Provider value={rowContextValue}>
```

## Repo conventions to follow

- Imitate `key={header.id}` on `DataGridTableDndHeader` in `data-grid-table-dnd.tsx:238`.
- Imitate `key={cell.id}` in `data-grid-table.tsx:960`.
- Keep `function` components. Do not extract a shared header renderer.

## Steps

1. `data-grid-table.tsx`: both header maps (`DataGridTableHeader` and `DataGridTable`) use `headerGroup.id` and `header.id`.
2. `data-grid-table-dnd.tsx`: the header-group `key={index}` becomes `headerGroup.id`. Do not touch skeleton `colIndex` keys.
3. `data-grid-table-dnd-rows.tsx`: header group and header cell keys as above; live cell at the `DataGridTableDndRow` map uses `cell.id`; memoize `SortableRowContext` as in Target. Do not touch skeleton keys.
4. `data-grid-table-virtual.tsx`: `key={headerGroup.id}` and `key={header.id}` (replace `hIndex` too).

## Boundaries

- Do NOT change column resize, pinning, virtualization, or drag logic.
- Do NOT edit `data-grid-pagination.tsx` (`key={i}` is the page index and is the button's identity).
- Do NOT add dependencies or lint suppressions.
- STOP if a listed `key={index}` is gone or the surrounding header markup has drifted.

## Verification

- **Mechanical**: React Doctor no longer reports `no-array-index-as-key` for these four files, and no longer reports `jsx-no-constructed-context-values` for `data-grid-table-dnd-rows.tsx`. `pnpm --filter @ploutizo/ui typecheck` and `pnpm --filter @ploutizo/ui test` pass.
- **Behavior check**: Transactions table still shows one header per column. Resize a column, then hide and show a column: the resize handle stays on that column. A dashboard or settings row-drag grid still drags the row you grab.
- **Done when**: the listed diagnostics are clear and header/cell identity follows the column id.
