import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { ListFilterIcon } from 'lucide-react'
import { Button } from '@ploutizo/ui/components/button'
import { Filters } from '@ploutizo/ui/components/reui/filters'
import { Text } from '@ploutizo/ui/components/text'
import { TransactionsTable } from './TransactionsTable'
import { TransactionSheet } from './TransactionSheet'
import { buildFilterFields } from './TransactionFilterFields'
import type { Filter } from '@ploutizo/ui/components/reui/filters'
import type { TransactionSearch } from './transactionSearch'
import type { TransactionRow } from '@/lib/data-access/transactions'
import { useGetTransactions } from '@/lib/data-access/transactions'
import { useGetAccounts } from '@/lib/data-access/accounts'
import { useGetCategories } from '@/lib/data-access/categories'
import { useGetOrgMembers } from '@/lib/data-access/org'
import { useGetTags } from '@/lib/data-access/tags'

// Strips URL params that match their defaults to keep the URL clean (D-04)
export const buildCleanSearch = (
  params: Partial<TransactionSearch>
): Partial<TransactionSearch> => {
  const result: Partial<TransactionSearch> = { ...params }
  if (result.page === 1) delete result.page
  if (result.limit === 25) delete result.limit
  if (result.sort === 'date') delete result.sort
  if (result.order === 'desc') delete result.order
  if (!result.type) delete result.type
  if (!result.dateFrom) delete result.dateFrom
  if (!result.dateTo) delete result.dateTo
  if (!result.accountId) delete result.accountId
  if (!result.categoryId) delete result.categoryId
  if (!result.assigneeId) delete result.assigneeId
  if (!result.tagIds) delete result.tagIds
  // Strip default-value operators so they don't pollute the URL.
  // Only non-default operators (e.g. 'is_not', 'includes_all') appear in URL params.
  if (result.type_op === 'is') delete result.type_op
  if (result.accountId_op === 'is') delete result.accountId_op
  if (result.categoryId_op === 'is') delete result.categoryId_op
  if (result.assigneeId_op === 'is') delete result.assigneeId_op
  if (result.tagIds_op === 'is_any_of') delete result.tagIds_op
  if (result.dateRange_op === 'between') delete result.dateRange_op
  return result
}

// Maps Filter[] state back to URL search params, including operator params
const filtersToSearch = (filters: Filter<string>[]): Partial<TransactionSearch> => {
  const result: Partial<TransactionSearch> = {}
  for (const f of filters) {
    if (f.field === 'type' && f.values[0]) {
      result.type = f.values[0]
      if (f.operator && f.operator !== 'is') result.type_op = f.operator
    } else if (f.field === 'dateRange') {
      const op = f.operator ?? 'between'
      if (op === 'after' && f.values[0]) {
        result.dateFrom = f.values[0]
        result.dateRange_op = 'after'
      } else if (op === 'before' && f.values[0]) {
        result.dateTo = f.values[0]
        result.dateRange_op = 'before'
      } else if (op === 'is' && f.values[0]) {
        // 'is X' — send as dateFrom; API uses eq on dateFrom when op=is
        result.dateFrom = f.values[0]
        result.dateRange_op = 'is'
      } else if (op === 'is_not' && f.values[0]) {
        result.dateFrom = f.values[0]
        result.dateRange_op = 'is_not'
      } else if (op === 'not_between') {
        result.dateFrom = f.values[0] ?? ''
        result.dateTo = f.values[1] ?? ''
        result.dateRange_op = 'not_between'
      } else if (f.values.length >= 1) {
        // 'between' (default)
        result.dateFrom = f.values[0]
        result.dateTo = f.values[1] ?? ''
        // dateRange_op 'between' is the default — omit from URL
      }
    } else if (f.field === 'accountId' && f.values[0]) {
      result.accountId = f.values[0]
      if (f.operator && f.operator !== 'is') result.accountId_op = f.operator
    } else if (f.field === 'categoryId') {
      if (f.operator === 'empty' || f.operator === 'not_empty') {
        result.categoryId_op = f.operator // no value needed for empty/not_empty
      } else if (f.values[0]) {
        result.categoryId = f.values[0]
        if (f.operator && f.operator !== 'is') result.categoryId_op = f.operator
      }
    } else if (f.field === 'assigneeId') {
      if (f.operator === 'empty' || f.operator === 'not_empty') {
        result.assigneeId_op = f.operator // no value needed for empty/not_empty
      } else if (f.values[0]) {
        result.assigneeId = f.values[0]
        if (f.operator && f.operator !== 'is') result.assigneeId_op = f.operator
      }
    } else if (f.field === 'tagIds') {
      if (f.operator === 'empty' || f.operator === 'not_empty') {
        result.tagIds_op = f.operator // no value needed for empty/not_empty
      } else if (f.values.length > 0) {
        result.tagIds = f.values.join(',')
        if (f.operator && f.operator !== 'is_any_of') result.tagIds_op = f.operator
      }
    }
  }
  return result
}

// Maps URL search params back to Filter[] for initial filter bar state.
// IDs are stable per field (not Date.now()) so filter chips keep their React
// identity across URL-sync re-renders — prevents open popovers from unmounting.
// Operators are now restored from URL params so they survive page refresh.
const searchToFilters = (search: TransactionSearch): Filter<string>[] => {
  const filters: Filter<string>[] = []
  if (search.type) {
    filters.push({ id: 'filter-type', field: 'type', operator: search.type_op ?? 'is', values: [search.type] })
  }
  // categoryId — handle empty/not_empty (no value needed)
  if (search.categoryId_op === 'empty' || search.categoryId_op === 'not_empty') {
    filters.push({ id: 'filter-categoryId', field: 'categoryId', operator: search.categoryId_op, values: [] })
  } else if (search.categoryId) {
    filters.push({ id: 'filter-categoryId', field: 'categoryId', operator: search.categoryId_op ?? 'is', values: [search.categoryId] })
  }
  // assigneeId — handle empty/not_empty
  if (search.assigneeId_op === 'empty' || search.assigneeId_op === 'not_empty') {
    filters.push({ id: 'filter-assigneeId', field: 'assigneeId', operator: search.assigneeId_op, values: [] })
  } else if (search.assigneeId) {
    filters.push({ id: 'filter-assigneeId', field: 'assigneeId', operator: search.assigneeId_op ?? 'is', values: [search.assigneeId] })
  }
  if (search.accountId) {
    filters.push({ id: 'filter-accountId', field: 'accountId', operator: search.accountId_op ?? 'is', values: [search.accountId] })
  }
  // tagIds — handle empty/not_empty
  if (search.tagIds_op === 'empty' || search.tagIds_op === 'not_empty') {
    filters.push({ id: 'filter-tagIds', field: 'tagIds', operator: search.tagIds_op, values: [] })
  } else if (search.tagIds) {
    filters.push({ id: 'filter-tagIds', field: 'tagIds', operator: search.tagIds_op ?? 'is_any_of', values: search.tagIds.split(',') })
  }
  // dateRange
  const dateOp = search.dateRange_op ?? 'between'
  if (dateOp === 'after' && search.dateFrom) {
    filters.push({ id: 'filter-dateRange', field: 'dateRange', operator: 'after', values: [search.dateFrom] })
  } else if (dateOp === 'before' && search.dateTo) {
    filters.push({ id: 'filter-dateRange', field: 'dateRange', operator: 'before', values: [search.dateTo] })
  } else if (dateOp === 'is' && search.dateFrom) {
    filters.push({ id: 'filter-dateRange', field: 'dateRange', operator: 'is', values: [search.dateFrom] })
  } else if (dateOp === 'is_not' && search.dateFrom) {
    filters.push({ id: 'filter-dateRange', field: 'dateRange', operator: 'is_not', values: [search.dateFrom] })
  } else if (dateOp === 'not_between' && (search.dateFrom || search.dateTo)) {
    filters.push({ id: 'filter-dateRange', field: 'dateRange', operator: 'not_between', values: [search.dateFrom ?? '', search.dateTo ?? ''] })
  } else if (search.dateFrom || search.dateTo) {
    filters.push({ id: 'filter-dateRange', field: 'dateRange', operator: 'between', values: [search.dateFrom ?? '', search.dateTo ?? ''] })
  }
  return filters
}

export const Transactions = () => {
  // from: '/_layout/transactions' is the route ID (not fullPath) — useMatch looks up
  // the match store by route ID, so fullPath '/transactions' would miss the store and
  // throw the invariant regardless of strict mode (strict is not wired to shouldThrow
  // in useMatch v1.168). Route ID confirmed in routeTree.gen.ts FileRoutesById.
  const search = useSearch({ from: '/_layout/transactions' })
  const navigate = useNavigate()

  // Fire ALL queries at top level — no waterfalls (vercel-react-best-practices)
  const { data: txData, isLoading } = useGetTransactions({
    page: search.page ?? 1,
    limit: search.limit ?? 25,
    sort: search.sort ?? 'date',
    order: search.order ?? 'desc',
    type: search.type,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    accountId: search.accountId,
    categoryId: search.categoryId,
    assigneeId: search.assigneeId,
    tagIds: search.tagIds,
    type_op: search.type_op,
    accountId_op: search.accountId_op,
    categoryId_op: search.categoryId_op,
    assigneeId_op: search.assigneeId_op,
    tagIds_op: search.tagIds_op,
    dateRange_op: search.dateRange_op,
  })

  const { data: accounts = [] } = useGetAccounts()
  const { data: categories = [] } = useGetCategories()
  const { data: members = [] } = useGetOrgMembers()
  const { data: tags = [] } = useGetTags()

  const transactions = txData?.data ?? []
  const total = txData?.total ?? 0
  const page = search.page ?? 1
  const limit = search.limit ?? 25
  const sort = search.sort ?? 'date'
  const order = search.order ?? 'desc'

  // Local filter bar state — initialized from URL on mount; updated via handleFiltersChange.
  // Operators now round-trip through the URL (e.g. ?type_op=is_not) so they survive page refresh.
  // The URL-sync effect restores operators from URL on external navigation (back/forward).
  const [sheetOpen, setSheetOpen] = useState<boolean>(false)
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null)

  const [activeFilters, setActiveFilters] = useState<Filter<string>[]>(
    () => searchToFilters(search)
  )

  // When URL-encoded filter values change externally (e.g. browser back/forward,
  // or programmatic navigation) sync the local filter state. We detect changes by
  // comparing the serialized filter values from the URL against what we have locally,
  // rather than replacing the whole array (which would lose operators).
  const prevSearchRef = useRef(search)
  useEffect(() => {
    const prev = prevSearchRef.current
    prevSearchRef.current = search

    // Check whether any filter-value or operator params actually changed
    const filterKeys = [
      'type', 'dateFrom', 'dateTo', 'accountId', 'categoryId', 'assigneeId', 'tagIds',
      'type_op', 'accountId_op', 'categoryId_op', 'assigneeId_op', 'tagIds_op', 'dateRange_op',
    ] as const
    const changed = filterKeys.some((k) => prev[k] !== search[k])
    if (!changed) return

    // Re-derive from URL including operators (operators now persist in URL)
    const fromUrl = searchToFilters(search)
    setActiveFilters(fromUrl)
  }, [search])

  const hasActiveFilters =
    Boolean(search.type) ||
    Boolean(search.dateFrom) ||
    Boolean(search.dateTo) ||
    Boolean(search.accountId) ||
    Boolean(search.categoryId) ||
    Boolean(search.assigneeId) ||
    Boolean(search.tagIds) ||
    // empty/not_empty operators don't require a value param
    search.categoryId_op === 'empty' || search.categoryId_op === 'not_empty' ||
    search.assigneeId_op === 'empty' || search.assigneeId_op === 'not_empty' ||
    search.tagIds_op === 'empty' || search.tagIds_op === 'not_empty'

  // Build FilterFieldConfig for the Filters component (6 fields per D-28)
  const filterFields = useMemo(
    () => buildFilterFields(accounts, categories, members, tags),
    [accounts, categories, members, tags]
  )

  const handleFiltersChange = useCallback(
    (filters: Filter<string>[]) => {
      // Update local state immediately so operators aren't snapped back by
      // the URL-sync effect. The effect only overwrites values, not operators,
      // but updating local state first prevents any intermediate flicker.
      setActiveFilters(filters)
      const mapped = filtersToSearch(filters)
      void navigate({
        to: '/transactions',
        // Rebuild from scratch — only keep sort/pagination from prev.
        // Spreading prev would leave stale filter params when a filter is removed.
        search: (prev) =>
          buildCleanSearch({ page: 1, limit: prev.limit, sort: prev.sort, order: prev.order, ...mapped }),
        replace: true,
      })
    },
    [navigate]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      void navigate({
        to: '/transactions',
        search: (prev) => buildCleanSearch({ ...prev, page: newPage }),
        replace: true,
      })
    },
    [navigate]
  )

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      void navigate({
        to: '/transactions',
        search: (prev) => buildCleanSearch({ ...prev, limit: newLimit, page: 1 }),
        replace: true,
      })
    },
    [navigate]
  )

  const handleSortChange = useCallback(
    (col: TransactionSearch['sort'], dir: 'asc' | 'desc') => {
      void navigate({
        to: '/transactions',
        search: (prev) => buildCleanSearch({ ...prev, sort: col, order: dir, page: 1 }),
        replace: true,
      })
    },
    [navigate]
  )

  const handleClearFilters = useCallback(() => {
    setActiveFilters([])
    void navigate({
      to: '/transactions',
      search: () => buildCleanSearch({}),
    })
  }, [navigate])

  const handleAddClick = useCallback(() => {
    setSelectedTx(null)
    setSheetOpen(true)
  }, [])

  const handleEdit = useCallback((transaction: TransactionRow) => {
    setSelectedTx(transaction)
    setSheetOpen(true)
  }, [])

  // Opens the original transaction in edit mode when a refund sub-line is clicked.
  // Does a client-side lookup in the already-fetched page — no-op if not found (T-03.4.1-TB3).
  const handleOpenOriginal = useCallback((id: string) => {
    const tx = transactions.find((t) => t.id === id)
    if (tx) handleEdit(tx)
  }, [transactions, handleEdit])

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false)
    // selectedTx intentionally not cleared here — clearing it changes the key
    // on TransactionForm mid-animation, causing a visible flash. handleEdit and
    // handleAddClick always set selectedTx before opening, so stale state here is harmless.
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Text as="h1" variant="h3" className="min-w-0 truncate">Transactions</Text>
        <Button type="button" onClick={handleAddClick} className="shrink-0">
          Add transaction
        </Button>
      </div>

      {/* Filter bar — full-width, no sticky */}
      {/* trigger prop required: useRender renders an empty invisible button without it */}
      <Filters<string>
        filters={activeFilters}
        fields={filterFields}
        onChange={handleFiltersChange}
        trigger={
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <ListFilterIcon className="size-3.5" />
            Filters
          </Button>
        }
      />

      <TransactionsTable
        transactions={transactions}
        total={total}
        isLoading={isLoading}
        page={page}
        limit={limit}
        sort={sort}
        order={order}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSortChange={handleSortChange}
        onFilteredEmpty={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onEdit={handleEdit}
        onOpenOriginal={handleOpenOriginal}
      />

      <TransactionSheet
        open={sheetOpen}
        transaction={selectedTx}
        onClose={handleSheetClose}
      />
    </div>
  )
}
