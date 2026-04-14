---
quick_task: 260413-sxp
type: summary
completed: 2026-04-13
duration_minutes: 25
tasks_completed: 2
files_created: 6
files_modified: 3
commits:
  - hash: 4e5e02c
    message: "refactor(260413-sxp): extract types, columns, and empty states from TransactionsTable"
  - hash: e33b90c
    message: "refactor(260413-sxp): extract filter fields and replace date range with Popover Calendar"
key_decisions:
  - "PopoverTrigger uses render prop (base-ui pattern) — not asChild. Project uses @base-ui/react Popover, not Radix"
  - "date-fns added to apps/web (was only in packages/ui) for format/parseISO/isValid in filter renderer"
  - "Calendar installed via shadcn CLI into packages/ui (not apps/web) — consistent with ui-level component strategy"
---

# Quick Task 260413-sxp: Transactions Component Refactor Summary

One-liner: Decomposed two monolith files into 6 single-responsibility modules — types, columns, empty states, filter config, and Popover date range picker.

## What Was Done

### Files Created

| File | Responsibility | Lines |
|------|---------------|-------|
| `transactions.types.ts` | `transactionSearchSchema` + `TransactionSearch` type | 23 |
| `transactions-columns.tsx` | `buildColumns()` factory, `DynamicLucideIcon`, `getInitials`, badge maps | 315 |
| `transactions-table-empty.tsx` | `TransactionsTableEmpty` component | 19 |
| `transactions-table-empty-filtered.tsx` | `TransactionsTableEmptyFiltered` component | 14 |
| `transactions-filter-fields.tsx` | `buildFilterFields()` + `DateRangeFilterRenderer` (Popover + Calendar) | 106 |
| `packages/ui/src/components/calendar.tsx` | shadcn Calendar (react-day-picker, range mode support) | installed |

### Files Modified

| File | Change | Lines (after) |
|------|--------|--------------|
| `TransactionsTable.tsx` | Replaced inline columns/empty states with imports | 161 (was 491) |
| `Transactions.tsx` | Replaced inline filterFields useMemo with `buildFilterFields` call | 263 (was 330) |
| `_layout.transactions.tsx` | Routing only — imports schema from types file, re-exports type | 10 (was 30) |

## Key Decisions

**1. PopoverTrigger render prop (not asChild)**
The project uses `@base-ui/react` Popover, not Radix. `@base-ui/react` uses a `render` prop pattern for slot composition. `asChild` would throw a TypeScript error. Using `render={<Button .../>}` matches how DropdownMenuTrigger and other base-ui components are used across the codebase.

**2. date-fns added to apps/web**
`date-fns` was already a dep of `packages/ui` (installed by shadcn Calendar). `transactions-filter-fields.tsx` lives in `apps/web`, so it needed its own dep entry. Added `date-fns@^4.1.0` to `apps/web/package.json` for `format`, `parseISO`, and `isValid`.

**3. Calendar installed at packages/ui level**
Consistent with how all shadcn components are installed — once in `packages/ui`, consumed across apps via the `@ploutizo/ui/components/calendar` export path.

## Verification

- TypeScript: no new errors in `apps/web/src/` (pre-existing `packages/ui` path alias errors unaffected)
- Build: `pnpm build` in `apps/web` succeeds in 231ms
- All files in `apps/web/src/components/transactions/` are under 320 lines
- `_layout.transactions.tsx` is 10 lines (routing only)
- `TransactionsTable.tsx` has no inline `ColumnDef` definitions
- `Transactions.tsx` has no inline `filterFields` array

## Deviations from Plan

None — plan executed exactly as written. The `render` prop pattern instead of `asChild` was anticipated by the constraint note "Do not modify base components."

## Self-Check

Files created/modified:
- `transactions.types.ts` — exists
- `transactions-columns.tsx` — exists
- `transactions-table-empty.tsx` — exists
- `transactions-table-empty-filtered.tsx` — exists
- `transactions-filter-fields.tsx` — exists
- `TransactionsTable.tsx` — modified
- `Transactions.tsx` — modified
- `_layout.transactions.tsx` — modified

Commits:
- 4e5e02c — exists
- e33b90c — exists

## Self-Check: PASSED
