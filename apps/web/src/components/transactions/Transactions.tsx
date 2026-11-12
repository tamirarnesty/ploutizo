import { useCallback, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@ploutizo/ui/components/button';
import { Page } from '@ploutizo/ui/components/page';
import type { TransactionRow } from '@ploutizo/validators';
import { PageHeader } from '@/components/PageHeader';
import { useGetTransactions } from '@/lib/data-access/transactions';
import { useGetAccounts } from '@/lib/data-access/accounts';
import { useGetCategories } from '@/lib/data-access/categories';
import { useGetHouseholdMembers } from '@/lib/data-access/household';
import { useGetTags } from '@/lib/data-access/tags';
import { useTablePageSize } from '@/hooks/persistedPageSize';
import { TransactionsTable } from './TransactionsTable';
import { TransactionSheet } from './TransactionSheet';
import { TransactionsFilterBar } from './TransactionsFilterBar';
import { buildTransactionQueryParams } from './transactionSearch';
import { buildCleanSearch, hasActiveFilters } from './transactionFilterUrl';
import type { TransactionFilterReferenceData } from './transactionFilterTypes';
import type { TransactionSearch } from './transactionSearch';

const NO_TRANSACTIONS: TransactionRow[] = [];
const NO_REFERENCES: never[] = [];

export const Transactions = () => {
  const search = useSearch({ from: '/_layout/transactions' });
  const navigate = useNavigate();
  const { pageSize: limit, setPageSize } = useTablePageSize('transactions');

  // Fire ALL queries at top level — no waterfalls (vercel-react-best-practices)
  const transactionQueryParams = buildTransactionQueryParams(search, limit);
  const { data: txData, isLoading } = useGetTransactions(
    transactionQueryParams
  );

  const { data: accounts } = useGetAccounts();
  const { data: categories } = useGetCategories();
  const { data: members } = useGetHouseholdMembers();
  const { data: tags } = useGetTags();
  const filterReferenceData: TransactionFilterReferenceData = {
    accounts: accounts ?? NO_REFERENCES,
    categories: categories ?? NO_REFERENCES,
    members: members ?? NO_REFERENCES,
    tags: tags ?? NO_REFERENCES,
    loaded: [accounts, categories, members, tags].every(Boolean),
  };

  const transactions = txData?.data ?? NO_TRANSACTIONS;
  const total = txData?.total ?? 0;
  const page = search.page ?? 1;
  const sort = search.sort ?? 'date';
  const order = search.order ?? 'desc';

  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);

  const handleClearAllNarrowing = useCallback(() => {
    void navigate({
      to: '/transactions',
      search: () => buildCleanSearch({}),
    });
  }, [navigate]);

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
    <Page>
      {/* Rendered inside the header so its SheetTrigger lands where the
          button was; Sheet/portal parts emit no inline DOM. Page content
          must stay outside the Sheet root — dialogs inside it are marked
          nested by Base UI and lose their backdrop overlay. */}
      <PageHeader
        title="Transactions"
        actions={
          <TransactionSheet
            open={sheetOpen}
            onSheetOpenChange={setSheetOpen}
            transaction={selectedTx}
            onClose={handleSheetClose}
            trigger={
              <Button
                type="button"
                className="shrink-0"
                onClick={handleAddClick}
              >
                Add transaction
              </Button>
            }
          />
        }
      />

      <TransactionsFilterBar
        search={search}
        referenceData={filterReferenceData}
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
        onClearFilters={handleClearAllNarrowing}
        onAddTransaction={handleAddClick}
        onEdit={handleEdit}
        onOpenOriginal={handleOpenOriginal}
      />
    </Page>
  );
};
