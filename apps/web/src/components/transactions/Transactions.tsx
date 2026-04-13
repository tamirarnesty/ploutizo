import { useCallback, useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { ListFilterIcon } from 'lucide-react'
import { Button } from '@ploutizo/ui/components/button'
import { Filters } from '@ploutizo/ui/components/reui/filters'
import { TransactionsTable } from './TransactionsTable'
import type { Filter, FilterFieldConfig } from '@ploutizo/ui/components/reui/filters'
import type { TransactionSearch } from '../../routes/_layout.transactions'
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
const filtersToSearch = (filters: Array<Filter<string>>): Partial<TransactionSearch> => {
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

// Maps URL search params back to Filter[] for initial filter bar state
const searchToFilters = (search: TransactionSearch): Array<Filter<string>> => {
  const filters: Array<Filter<string>> = []
  if (search.type) {
    filters.push({ id: `type-${Date.now()}`, field: 'type', operator: 'is', values: [search.type] })
  }
  if (search.dateFrom || search.dateTo) {
    filters.push({
      id: `dateRange-${Date.now()}`,
      field: 'dateRange',
      operator: 'between',
      values: [search.dateFrom ?? '', search.dateTo ?? ''],
    })
  }
  if (search.accountId) {
    filters.push({ id: `account-${Date.now()}`, field: 'accountId', operator: 'is', values: [search.accountId] })
  }
  if (search.categoryId) {
    filters.push({ id: `category-${Date.now()}`, field: 'categoryId', operator: 'is', values: [search.categoryId] })
  }
  if (search.assigneeId) {
    filters.push({ id: `assignee-${Date.now()}`, field: 'assigneeId', operator: 'is', values: [search.assigneeId] })
  }
  if (search.tagIds) {
    filters.push({ id: `tags-${Date.now()}`, field: 'tagIds', operator: 'is_any_of', values: search.tagIds.split(',') })
  }
  return filters
}

export const Transactions = () => {
  const search = useSearch({ from: '/_layout/transactions' })
  const navigate = useNavigate({ from: '/_layout/transactions' })

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

  // Derive active filters from URL params for the Filters bar
  const activeFilters = useMemo(() => searchToFilters(search), [search])

  const hasActiveFilters =
    Boolean(search.type) ||
    Boolean(search.dateFrom) ||
    Boolean(search.dateTo) ||
    Boolean(search.accountId) ||
    Boolean(search.categoryId) ||
    Boolean(search.assigneeId) ||
    Boolean(search.tagIds)

  // Build FilterFieldConfig for the Filters component (6 fields per D-28)
  const filterFields = useMemo<Array<FilterFieldConfig<string>>>(
    () => [
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
          { value: 'transfer', label: 'Transfer' },
          { value: 'settlement', label: 'Settlement' },
          { value: 'refund', label: 'Refund' },
          { value: 'contribution', label: 'Contribution' },
        ],
      },
      {
        key: 'dateRange',
        label: 'Date Range',
        type: 'custom',
        defaultOperator: 'between',
        // Date range uses between operator: values are [from, to] strings
        customRenderer: ({ values, onChange }) => {
          const [from = '', to = ''] = values
          return (
            <div className="flex items-center gap-1.5 px-2 py-1">
              <input
                type="date"
                value={from}
                aria-label="Date from"
                className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                onChange={(e) => onChange([e.target.value, to])}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={to}
                aria-label="Date to"
                className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                onChange={(e) => onChange([from, e.target.value])}
              />
            </div>
          )
        },
      },
      {
        key: 'accountId',
        label: 'Account',
        type: 'select',
        options: accounts.map((a) => ({ value: a.id, label: a.name })),
      },
      {
        key: 'categoryId',
        label: 'Category',
        type: 'select',
        options: categories.map((c) => ({ value: c.id, label: c.name })),
      },
      {
        key: 'assigneeId',
        label: 'Assignee',
        type: 'select',
        options: members.map((m) => ({ value: m.id, label: m.displayName })),
      },
      {
        key: 'tagIds',
        label: 'Tags',
        type: 'multiselect',
        defaultOperator: 'is_any_of',
        options: tags.map((t) => ({ value: t.id, label: t.name })),
      },
    ],
    [accounts, categories, members, tags]
  )

  const handleFiltersChange = useCallback(
    (filters: Array<Filter<string>>) => {
      const mapped = filtersToSearch(filters)
      void navigate({
        to: '/transactions',
        search: (prev) => buildCleanSearch({ ...prev, ...mapped, page: 1 }),
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
