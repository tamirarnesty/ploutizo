import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ListFilterIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Filters } from '@ploutizo/ui/components/reui/filters';
import { Text } from '@ploutizo/ui/components/text';
import { isFilterValueActive } from '@ploutizo/ui/components/reui/filters-utils';
import type { Filter } from '@ploutizo/ui/components/reui/filters-types';
import type { TransactionRow } from '@ploutizo/validators';
import { useGetTransactions } from '@/lib/data-access/transactions';
import { useGetAccounts } from '@/lib/data-access/accounts';
import { useGetCategories } from '@/lib/data-access/categories';
import { useGetHouseholdMembers } from '@/lib/data-access/household';
import { useGetTags } from '@/lib/data-access/tags';
import { useTablePageSize } from '@/hooks/persistedPageSize';
import { TransactionsTable } from './TransactionsTable';
import { TransactionSheet } from './TransactionSheet';
import { buildFilterFields } from './TransactionFilterFields';
import { buildTransactionQueryParams } from './transactionSearch';
import {
  TRANSACTION_PINNED_FILTER_FIELD_KEYS_LIST,
  withPinnedTransactionFilters,
} from './transactionPinnedFilters';
import {
  buildCleanSearch,
  filtersToSearch,
  hasActiveFilters,
  searchToFilters,
} from './transactionFilterUrl';
import type { TransactionSearch } from './transactionSearch';

const NO_TRANSACTIONS: TransactionRow[] = [];

export const Transactions = () => {
  const search = useSearch({ from: '/_layout/transactions' });
  const navigate = useNavigate();
  const { pageSize: limit, setPageSize } = useTablePageSize('transactions');

  // Fire ALL queries at top level — no waterfalls (vercel-react-best-practices)
  const transactionQueryParams = buildTransactionQueryParams(search, limit);
  const { data: txData, isLoading } = useGetTransactions(
    transactionQueryParams
  );

  const { data: accounts = [] } = useGetAccounts();
  const { data: categories = [] } = useGetCategories();
  const { data: members = [] } = useGetHouseholdMembers();
  const { data: tags = [] } = useGetTags();

  const transactions = txData?.data ?? NO_TRANSACTIONS;
  const total = txData?.total ?? 0;
  const page = search.page ?? 1;
  const sort = search.sort ?? 'date';
  const order = search.order ?? 'desc';

  // Local filter bar state — initialized from URL on mount; updated via handleFiltersChange.
  // Operators now round-trip through the URL (e.g. ?type_op=is_not) so they survive page refresh.
  // The URL-sync effect restores operators from URL on external navigation (back/forward).
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);

  const [activeFilters, setActiveFilters] = useState<Filter<string>[]>(() =>
    withPinnedTransactionFilters(searchToFilters(search))
  );

  // When URL-encoded filter values change externally (e.g. browser back/forward,
  // or programmatic navigation) sync the local filter state. We detect changes by
  // comparing the serialized filter values from the URL against what we have locally,
  // rather than replacing the whole array (which would lose operators).
  const prevSearchRef = useRef(search);
  useEffect(() => {
    const prev = prevSearchRef.current;
    prevSearchRef.current = search;

    // Check whether any filter-value or operator params actually changed
    const filterKeys = [
      'type',
      'dateFrom',
      'dateTo',
      'accountId',
      'categoryId',
      'assigneeId',
      'tagIds',
      'type_op',
      'accountId_op',
      'categoryId_op',
      'assigneeId_op',
      'tagIds_op',
      'dateRange_op',
      'importBatchId',
      'importOutcome',
    ] as const;
    const changed = filterKeys.some((k) => prev[k] !== search[k]);
    if (!changed) return;

    // Re-derive from URL including operators (operators now persist in URL)
    const fromUrl = searchToFilters(search);
    setActiveFilters(withPinnedTransactionFilters(fromUrl));
  }, [search]);

  // Build FilterFieldConfig for the Filters component (6 fields per D-28).
  // Import result is only offered when a provenance batch is already in the URL.
  const filterFields = useMemo(
    () =>
      buildFilterFields(accounts, categories, members, tags, {
        includeImportResult: Boolean(search.importBatchId),
      }),
    [accounts, categories, members, tags, search.importBatchId]
  );

  const handleFiltersChange = useCallback(
    (filters: Filter<string>[]) => {
      // Update local state before navigate so the filter row does not flicker
      // while URL search params catch up.
      const nextFilters = withPinnedTransactionFilters(filters);
      setActiveFilters(nextFilters);
      const mapped = filtersToSearch(nextFilters.filter(isFilterValueActive));
      void navigate({
        to: '/transactions',
        // Rebuild from scratch — only keep sort/pagination from prev.
        // Spreading prev would leave stale filter params when a filter is removed.
        // Import batch stays only while the Import result chip remains.
        search: (prev) =>
          buildCleanSearch({
            page: 1,
            sort: prev.sort,
            order: prev.order,
            ...mapped,
            importBatchId: mapped.importOutcome
              ? prev.importBatchId
              : undefined,
          }),
        replace: true,
      });
    },
    [navigate]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      void navigate({
        to: '/transactions',
        search: (prev) => buildCleanSearch({ ...prev, page: newPage }),
        replace: true,
      });
    },
    [navigate]
  );

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      setPageSize(newLimit);
      void navigate({
        to: '/transactions',
        search: (prev) => buildCleanSearch({ ...prev, page: 1 }),
        replace: true,
      });
    },
    [navigate, setPageSize]
  );

  const handleSortChange = useCallback(
    (col: TransactionSearch['sort'], dir: 'asc' | 'desc') => {
      void navigate({
        to: '/transactions',
        search: (prev) =>
          buildCleanSearch({ ...prev, sort: col, order: dir, page: 1 }),
        replace: true,
      });
    },
    [navigate]
  );

  const handleClearFilters = useCallback(() => {
    setActiveFilters(withPinnedTransactionFilters([]));
    void navigate({
      to: '/transactions',
      search: () => buildCleanSearch({}),
    });
  }, [navigate]);

  const handleAddClick = useCallback(() => {
    setSelectedTx(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((transaction: TransactionRow) => {
    setSelectedTx(transaction);
    setSheetOpen(true);
  }, []);

  // Opens the original transaction in edit mode when a refund sub-line is clicked.
  // Does a client-side lookup in the already-fetched page — no-op if not found (T-03.4.1-TB3).
  const handleOpenOriginal = useCallback(
    (id: string) => {
      const tx = transactions.find((t) => t.id === id);
      if (tx) handleEdit(tx);
    },
    [transactions, handleEdit]
  );

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    // selectedTx intentionally not cleared here — clearing it changes the key
    // on TransactionForm mid-animation, causing a visible flash. handleEdit and
    // handleAddClick always set selectedTx before opening, so stale state here is harmless.
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Text as="h1" variant="h3" className="min-w-0 truncate">
          Transactions
        </Text>
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
        pinnedFieldKeys={TRANSACTION_PINNED_FILTER_FIELD_KEYS_LIST}
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
        onFilteredEmpty={hasActiveFilters(search)}
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
  );
};
