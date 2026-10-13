import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ListFilterIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Filters } from '@ploutizo/ui/components/reui/filters';
import { Text } from '@ploutizo/ui/components/text';
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
  shouldPersistTransactionFilter,
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

  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);

  // Filter bar state is derived from URL search params (single source of truth).
  const activeFilters = useMemo(
    () => withPinnedTransactionFilters(searchToFilters(search)),
    [search]
  );

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
      const nextFilters = withPinnedTransactionFilters(filters);
      const mapped = filtersToSearch(
        nextFilters.filter(shouldPersistTransactionFilter)
      );
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
