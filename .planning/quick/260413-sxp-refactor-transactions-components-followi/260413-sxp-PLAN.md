---
quick_task: 260413-sxp
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/components/transactions/TransactionsTable.tsx
  - apps/web/src/components/transactions/transactions-columns.tsx
  - apps/web/src/components/transactions/transactions-table-empty.tsx
  - apps/web/src/components/transactions/transactions-table-empty-filtered.tsx
  - apps/web/src/components/transactions/Transactions.tsx
  - apps/web/src/components/transactions/transactions-filter-fields.tsx
  - apps/web/src/components/transactions/transactions.types.ts
  - apps/web/src/routes/_layout.transactions.tsx
autonomous: true
must_haves:
  truths:
    - "Each file in apps/web/src/components/transactions/ has a single responsibility"
    - "TransactionsTable.tsx is a thin shell — columns, empty states, and helpers are extracted"
    - "Transactions.tsx imports filter fields from a separate file"
    - "Route file contains only routing code — schema and type are in a types file"
    - "Date range customRenderer uses shadcn Popover instead of raw <input type=date>"
  artifacts:
    - path: "apps/web/src/components/transactions/transactions-columns.tsx"
      provides: "ColumnDef[] export + DynamicLucideIcon + getInitials + badge maps"
    - path: "apps/web/src/components/transactions/transactions-table-empty.tsx"
      provides: "TransactionsTableEmpty component"
    - path: "apps/web/src/components/transactions/transactions-table-empty-filtered.tsx"
      provides: "TransactionsTableEmptyFiltered component"
    - path: "apps/web/src/components/transactions/transactions-filter-fields.tsx"
      provides: "useDateRangeFilterRenderer + buildFilterFields"
    - path: "apps/web/src/components/transactions/transactions.types.ts"
      provides: "transactionSearchSchema + TransactionSearch type"
  key_links:
    - from: "apps/web/src/routes/_layout.transactions.tsx"
      to: "apps/web/src/components/transactions/transactions.types.ts"
      via: "import { transactionSearchSchema, TransactionSearch }"
    - from: "apps/web/src/components/transactions/TransactionsTable.tsx"
      to: "apps/web/src/components/transactions/transactions-columns.tsx"
      via: "import { buildColumns }"
    - from: "apps/web/src/components/transactions/Transactions.tsx"
      to: "apps/web/src/components/transactions/transactions-filter-fields.tsx"
      via: "import { buildFilterFields }"
---

<objective>
Refactor the transactions component directory to follow the "Thinking in React" principle: one file, one responsibility.

Purpose: The current TransactionsTable.tsx (~490 lines) and Transactions.tsx (~330 lines) are monoliths mixing column definitions, empty states, filter configs, helper functions, and render logic. This makes them hard to navigate and violates single-responsibility.

Output:
- `transactions.types.ts` — schema + TransactionSearch type (extracted from route file)
- `transactions-columns.tsx` — ColumnDef[], DynamicLucideIcon, getInitials, badge maps
- `transactions-table-empty.tsx` / `transactions-table-empty-filtered.tsx` — isolated empty state components
- `transactions-filter-fields.tsx` — filter field config factory + date range Popover renderer
- `TransactionsTable.tsx` reduced to table setup + delete dialog
- `Transactions.tsx` reduced to query orchestration + layout
- `_layout.transactions.tsx` reduced to routing-only code
</objective>

<execution_context>
@/Users/tarnesty/Developer/personal/ploutizo/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/Users/tarnesty/Developer/personal/ploutizo/apps/web/src/components/transactions/TransactionsTable.tsx
@/Users/tarnesty/Developer/personal/ploutizo/apps/web/src/components/transactions/Transactions.tsx
@/Users/tarnesty/Developer/personal/ploutizo/apps/web/src/routes/_layout.transactions.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract types, column defs, and empty state components</name>
  <files>
    apps/web/src/components/transactions/transactions.types.ts,
    apps/web/src/components/transactions/transactions-columns.tsx,
    apps/web/src/components/transactions/transactions-table-empty.tsx,
    apps/web/src/components/transactions/transactions-table-empty-filtered.tsx,
    apps/web/src/components/transactions/TransactionsTable.tsx,
    apps/web/src/routes/_layout.transactions.tsx
  </files>
  <action>
**Step 1 — Create `transactions.types.ts`:**

Move `transactionSearchSchema` and `TransactionSearch` out of `_layout.transactions.tsx` into this new file. The route file should then import them:

```ts
// apps/web/src/components/transactions/transactions.types.ts
import { z } from 'zod'

export const transactionSearchSchema = z.object({
  // ... (same schema as currently in _layout.transactions.tsx)
})
export type TransactionSearch = z.infer<typeof transactionSearchSchema>
```

Update `_layout.transactions.tsx` to:
```ts
import { transactionSearchSchema } from '../components/transactions/transactions.types'
export type { TransactionSearch } from '../components/transactions/transactions.types'
// Route uses: validateSearch: (search) => transactionSearchSchema.parse(search)
```

**Step 2 — Create `transactions-columns.tsx`:**

Move out of `TransactionsTable.tsx`:
- `DynamicLucideIcon` component
- `getInitials` function
- `typeBadgeClassName` map
- `typeBadgeVariant` map
- The entire `columns` array (currently inside `useMemo`) — convert to a `buildColumns` factory function that accepts a `setDeleteId` callback (needed for the actions column):

```tsx
export function buildColumns(
  setDeleteId: (id: string) => void
): ColumnDef<TransactionRow>[] { ... }
```

The factory replaces the `useMemo` in `TransactionsTable`. Call it as:
```tsx
const columns = useMemo(() => buildColumns(setDeleteId), [setDeleteId])
```

Keep all imports this file needs (lucide-react, badge maps, DataGridColumnHeader, Skeleton, etc.).

**Step 3 — Create `transactions-table-empty.tsx`:**

```tsx
// props: onAddTransaction callback (disabled for now — pass undefined)
export const TransactionsTableEmpty = () => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
    <p className="text-sm font-medium">No transactions yet</p>
    <p className="max-w-xs text-sm text-muted-foreground">
      Add your first transaction to start tracking your spending.
    </p>
    <Button
      type="button"
      disabled
      aria-disabled="true"
      title="Create transactions coming soon"
      className="mt-2"
    >
      Add transaction
    </Button>
  </div>
)
```

**Step 4 — Create `transactions-table-empty-filtered.tsx`:**

```tsx
interface TransactionsTableEmptyFilteredProps {
  onClearFilters: () => void
}
export const TransactionsTableEmptyFiltered = ({ onClearFilters }: TransactionsTableEmptyFilteredProps) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
    <p className="text-sm font-medium">No transactions match your filters</p>
    <Button variant="link" size="sm" onClick={onClearFilters}>
      Clear filters
    </Button>
  </div>
)
```

**Step 5 — Slim down `TransactionsTable.tsx`:**

Replace the inline `columns` useMemo with `buildColumns`, replace the two inline empty-state JSX blocks with `<TransactionsTableEmpty />` and `<TransactionsTableEmptyFiltered onClearFilters={onClearFilters} />`. Remove all the extracted code. The file should now contain only: state (`deleteId`), mutations, `handleConfirmDelete`, `table` setup, empty-state routing, and the return JSX (delete dialog + DataGrid).

**Step 6 — Update `_layout.transactions.tsx`:**

Remove the schema/type definition — import from `transactions.types`. Re-export `TransactionSearch` so existing imports in `Transactions.tsx` and `TransactionsTable.tsx` using `'../../routes/_layout.transactions'` continue to work without change (this avoids a cascade of import updates in Task 1).
  </action>
  <verify>pnpm --filter @ploutizo/web tsc --noEmit</verify>
  <done>TypeScript compiles clean. `_layout.transactions.tsx` contains only routing code. `TransactionsTable.tsx` no longer defines DynamicLucideIcon, getInitials, or badge maps inline. Empty state JSX is gone from TransactionsTable.tsx body.</done>
</task>

<task type="auto">
  <name>Task 2: Extract filter field config and replace date range renderer with shadcn Popover</name>
  <files>
    apps/web/src/components/transactions/transactions-filter-fields.tsx,
    apps/web/src/components/transactions/Transactions.tsx
  </files>
  <action>
**Step 1 — Install shadcn Calendar if not present:**

Check `packages/ui/src/components/` for `calendar.tsx`. If missing, add it via the shadcn CLI:
```bash
pnpm --filter @ploutizo/ui dlx shadcn@latest add calendar
```
Do NOT modify the generated file. The Calendar component will be imported at the usage site.

**Step 2 — Create `transactions-filter-fields.tsx`:**

Move the entire `filterFields` useMemo factory out of `Transactions.tsx` into a standalone function `buildFilterFields`. Also extract the date range `customRenderer` into a proper component `DateRangeFilterRenderer` that uses shadcn Popover + Calendar instead of two raw `<input type="date">` elements.

The date range renderer should match the ReUI custom controls pattern — a Popover trigger showing the selected range as text, with a Calendar (or two side-by-side calendars) in the PopoverContent:

```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@ploutizo/ui/components/popover'
import { Calendar } from '@ploutizo/ui/components/calendar'
import { Button } from '@ploutizo/ui/components/button'
import { CalendarIcon } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'

interface DateRangeFilterRendererProps {
  values: string[]
  onChange: (values: string[]) => void
}

const DateRangeFilterRenderer = ({ values, onChange }: DateRangeFilterRendererProps) => {
  const [from = '', to = ''] = values
  const fromDate = from && isValid(parseISO(from)) ? parseISO(from) : undefined
  const toDate = to && isValid(parseISO(to)) ? parseISO(to) : undefined

  const label = fromDate && toDate
    ? `${format(fromDate, 'MMM d, yyyy')} \u2013 ${format(toDate, 'MMM d, yyyy')}`
    : fromDate
      ? `From ${format(fromDate, 'MMM d, yyyy')}`
      : 'Pick date range'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-normal">
          <CalendarIcon className="size-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={fromDate || toDate ? { from: fromDate, to: toDate } : undefined}
          onSelect={(range) => {
            const newFrom = range?.from ? format(range.from, 'yyyy-MM-dd') : ''
            const newTo = range?.to ? format(range.to, 'yyyy-MM-dd') : ''
            onChange([newFrom, newTo])
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
```

Check if `date-fns` is already in the web package deps (`pnpm ls date-fns --filter @ploutizo/web`). If not, use native `Intl.DateTimeFormat` for formatting instead of date-fns, and parse dates with `new Date(from + 'T00:00:00')`.

The exported function signature:
```tsx
export function buildFilterFields(
  accounts: Array<{ id: string; name: string }>,
  categories: Array<{ id: string; name: string }>,
  members: Array<{ id: string; displayName: string }>,
  tags: Array<{ id: string; name: string }>,
): FilterFieldConfig<string>[]
```

Keep all 6 filter fields (type, dateRange, accountId, categoryId, assigneeId, tagIds) with the same config — only the `customRenderer` for dateRange changes.

**Step 3 — Update `Transactions.tsx`:**

Replace the `filterFields` useMemo with:
```tsx
import { buildFilterFields } from './transactions-filter-fields'

const filterFields = useMemo(
  () => buildFilterFields(accounts, categories, members, tags),
  [accounts, categories, members, tags]
)
```

Remove the `filtersToSearch` and `searchToFilters` helper functions from `Transactions.tsx` only if they belong in this new file (they don't — they are URL mapping logic that stays in `Transactions.tsx`). `buildCleanSearch` also stays in `Transactions.tsx` since it's exported and used elsewhere.
  </action>
  <verify>pnpm --filter @ploutizo/web tsc --noEmit && pnpm --filter @ploutizo/web build 2>&1 | tail -5</verify>
  <done>TypeScript clean. `Transactions.tsx` no longer contains the filterFields useMemo inline. Date range filter uses Popover + Calendar. The build succeeds (or fails only on unrelated pre-existing errors).</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Full structural refactor of the transactions components:
    - `transactions.types.ts` — schema + type
    - `transactions-columns.tsx` — ColumnDef[] factory + helpers
    - `transactions-table-empty.tsx` / `transactions-table-empty-filtered.tsx` — empty states
    - `transactions-filter-fields.tsx` — filter config factory + Popover date range renderer
    - `TransactionsTable.tsx` / `Transactions.tsx` — slim shells
    - `_layout.transactions.tsx` — routing only
  </what-built>
  <how-to-verify>
    1. Visit http://localhost:3000/transactions
    2. Confirm transaction list renders (data loads, table displays)
    3. Open Filters bar — click "Filters" button
    4. Add a "Date Range" filter — confirm the Popover opens with a calendar (not raw date inputs)
    5. Select a date range — confirm dates appear in the filter chip and the table filters
    6. Add a "Type" filter (e.g. Expense) — confirm table filters
    7. Click "Clear filters" on the empty-filtered state if applicable
    8. Check pagination still works
  </how-to-verify>
  <resume-signal>Type "approved" or describe any issues</resume-signal>
</task>

</tasks>

<verification>
- `pnpm --filter @ploutizo/web tsc --noEmit` passes
- No file in `apps/web/src/components/transactions/` exceeds ~200 lines
- `_layout.transactions.tsx` contains only `createFileRoute` call + import of schema/component
- `TransactionsTable.tsx` contains no inline ColumnDef definitions
- `Transactions.tsx` contains no inline `filterFields` array
</verification>

<success_criteria>
Each transactions file has one clear responsibility. A developer can open any file and immediately understand what it does from its name and ~first 10 lines.
</success_criteria>

<output>
After completion, create `.planning/quick/260413-sxp-refactor-transactions-components-followi/260413-sxp-SUMMARY.md` documenting what was extracted where and any decisions made (e.g. date-fns availability, Calendar installation).
</output>
