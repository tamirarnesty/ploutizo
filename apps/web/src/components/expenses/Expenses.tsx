import { useState } from 'react';
import { Text } from '@ploutizo/ui/components/text';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { useGetTransactions } from '@/lib/data-access/transactions';
import { TransactionsTable } from '@/components/transactions/TransactionsTable';
import { TransactionSheet } from '@/components/transactions/TransactionSheet';
import { useTablePageSize } from '@/hooks/persistedPageSize';

type SortCol = 'date' | 'amount' | 'type' | 'category' | 'account';

export const Expenses = () => {
  // Hard-coded type filter — D-05 says these are dedicated filtered pages, not
  // full filter UIs. No filter bar, no URL param sync, no filter operators.
  const [page, setPage] = useState(1);
  const { pageSize: limit, setPageSize } = useTablePageSize('expenses');
  const [sort, setSort] = useState<SortCol>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const { data: txData, isLoading } = useGetTransactions({
    page,
    limit,
    sort,
    order,
    type: 'expense',
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);

  const transactions = txData?.data ?? [];
  const total = txData?.total ?? 0;

  const handleEdit = (tx: TransactionRow) => {
    setSelectedTx(tx);
    setSheetOpen(true);
  };
  const handleSheetClose = () => {
    setSheetOpen(false);
    setSelectedTx(null);
  };
  // /expenses does not link refunds to originals — open in transactions list
  const handleOpenOriginal = () => undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Text as="h1" variant="h3" className="min-w-0 truncate">
          Expenses
        </Text>
      </div>

      <TransactionsTable
        transactions={transactions}
        total={total}
        isLoading={isLoading}
        page={page}
        limit={limit}
        sort={sort}
        order={order}
        onPageChange={setPage}
        onLimitChange={setPageSize}
        onSortChange={(nextSort, nextOrder) => {
          // TransactionsTable always passes a valid sort column; undefined is safe to ignore
          if (nextSort) setSort(nextSort);
          setOrder(nextOrder);
        }}
        onFilteredEmpty={false}
        onClearFilters={() => undefined}
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
