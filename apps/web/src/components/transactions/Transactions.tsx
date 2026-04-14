import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { ListFilterIcon } from 'lucide-react'
import { Button } from '@ploutizo/ui/components/button'
import { Filters } from '@ploutizo/ui/components/reui/filters'
import { TransactionsTable } from './TransactionsTable'
import { buildFilterFields } from './TransactionFilterFields'
import type { Filter } from '@ploutizo/ui/components/reui/filters'
import type { TransactionSearch } from './transactionSearch'
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
  return result
}

// Maps Filter[] state back to URL search params
const filtersToSearch = (filters: Filter<string>[]): Partial<TransactionSearch> => {
  const result: Partial<TransactionSearch> = {}
  for (const f of filters) {
    if (f.field === 'type' && f.values[0]) {
      result.type = f.values[0]
    } else if (f.field === 'dateRange' && f.values.length === 2) {
      result.dateFrom = f.values[0]
      result.dateTo = f.values[1]
    } else if (f.field === 'accountId' && f.values[0]) {
      result.accountId = f.values[0]
    } else if (f.field === 'categoryId' && f.values[0]) {
      result.categoryId = f.values[0]
    } else if (f.field === 'assigneeId' && f.values[0]) {
      result.assigneeId = f.values[0]
    } else if (f.field === 'tagIds' && f.values.length > 0) {
      result.tagIds = f.values.join(',')
    }
  }
  return result
}

// Maps URL search params back to Filter[] for initial filter bar state.
// IDs are stable per field (not Date.now()) so filter chips keep their React
// identity across URL-sync re-renders — prevents open popovers from unmounting.
const searchToFilters = (search: TransactionSearch): Filter<string>[] => {
  const filters: Filter<string>[] = []
  if (search.type) {
    filters.push({ id: 'filter-type', field: 'type', operator: 'is', values: [search.type] })
  }
  if (search.dateFrom || search.dateTo) {
    filters.push({
      id: 'filter-dateRange',
      field: 'dateRange',
      operator: 'between',
      values: [search.dateFrom ?? '', search.dateTo ?? ''],
    })
  }
  if (search.accountId) {
    filters.push({ id: 'filter-accountId', field: 'accountId', operator: 'is', values: [search.accountId] })
  }
  if (search.categoryId) {
    filters.push({ id: 'filter-categoryId', field: 'categoryId', operator: 'is', values: [search.categoryId] })
  }
  if (search.assigneeId) {
    filters.push({ id: 'filter-assigneeId', field: 'assigneeId', operator: 'is', values: [search.assigneeId] })
  }
  if (search.tagIds) {
    filters.push({ id: 'filter-tagIds', field: 'tagIds', operator: 'is_any_of', values: search.tagIds.split(',') })
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

  // Local filter bar state — initialized from URL once, then owned locally.
  // Operators are transient UI state: they don't round-trip through the URL
  // because the API has no operator params. Value changes push to URL via
  // handleFiltersChange; operator changes stay local so they don't snap back.
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

    // Check whether any filter-value params actually changed
    const filterKeys = ['type', 'dateFrom', 'dateTo', 'accountId', 'categoryId', 'assigneeId', 'tagIds'] as const
    const changed = filterKeys.some((k) => prev[k] !== search[k])
    if (!changed) return

    // Re-derive from URL, but preserve operators for fields that still exist
    const fromUrl = searchToFilters(search)
    setActiveFilters((local) => {
      return fromUrl.map((urlFilter) => {
        const existing = local.find((lf) => lf.field === urlFilter.field)
        // Keep the locally-set operator if the field is still active
        return existing ? { ...urlFilter, operator: existing.operator } : urlFilter
      })
    })
  }, [search])

  const hasActiveFilters =
    Boolean(search.type) ||
    Boolean(search.dateFrom) ||
    Boolean(search.dateTo) ||
    Boolean(search.accountId) ||
    Boolean(search.categoryId) ||
    Boolean(search.assigneeId) ||
    Boolean(search.tagIds)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate font-heading text-xl font-semibold">Transactions</h1>
        {/* Disabled until create transaction flow is built */}
        <Button
          type="button"
          disabled
          aria-disabled="true"
          title="Create transactions coming soon"
          className="shrink-0"
        >
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
        onSortChange={handleSortChange}
        onFilteredEmpty={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />
    </div>
  )
}
