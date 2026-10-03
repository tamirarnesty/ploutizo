import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useReactTable } from '@tanstack/react-table';
import { Button } from '@ploutizo/ui/components/button';
import { CardAction } from '@ploutizo/ui/components/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from '@ploutizo/ui/components/empty';
import type { TransactionRow } from '@ploutizo/validators';
import { DASHBOARD_RECENT_TRANSACTIONS_PARAMS } from '@/lib/data-access/transactions/dashboardRecentTransactions';
import type { DashboardRecentTransactionsQuery } from '@/lib/data-access/transactions/dashboardRecentTransactions';
import { usePreloadLucideIcons } from '@/components/categories/usePreloadLucideIcons';
import {
  DashboardLiveDataGrid,
  DashboardLiveDataGridScrollTable,
} from '@/components/dashboard/DashboardLiveDataGrid';
import { getDashboardQueryLiveState } from '@/components/dashboard/dashboardQueryLiveState';
import { dataGridCoreRowModel } from '@/components/data-grid/dataGridTableModels';
import { RECENT_TRANSACTION_COLUMNS } from '@/components/transactions/transactionColumnFactories';

const EMPTY_TRANSACTION_ROWS: TransactionRow[] = [];
const EMPTY_CATEGORY_ICONS: TransactionRow['categoryIcon'][] = [];

type RecentTransactionsCardProps = {
  query: DashboardRecentTransactionsQuery;
};

export const RecentTransactionsCard = ({
  query,
}: RecentTransactionsCardProps) => {
  const { data } = query;
  const { showError, isBusy } = getDashboardQueryLiveState(query, {
    busyWhileRefetching: false,
  });

  const rows = data?.data ?? EMPTY_TRANSACTION_ROWS;
  const recentLimit = DASHBOARD_RECENT_TRANSACTIONS_PARAMS.limit;
  const isEmpty = !showError && !isBusy && rows.length === 0;

  const categoryIcons = useMemo(
    () =>
      data === undefined
        ? EMPTY_CATEGORY_ICONS
        : rows.map((transaction) => transaction.categoryIcon),
    [data, rows]
  );
  usePreloadLucideIcons(categoryIcons);

  const table = useReactTable({
    data: rows,
    columns: RECENT_TRANSACTION_COLUMNS,
    getCoreRowModel: dataGridCoreRowModel,
    initialState: {
      pagination: { pageSize: recentLimit },
    },
  });

  return (
    <DashboardLiveDataGrid
      table={table}
      recordCount={isBusy ? recentLimit : rows.length}
      isLoading={isBusy}
      title="Recent transactions"
      errorResource="recent transactions"
      isError={showError}
      action={
        <CardAction className="row-span-1 self-center">
          <Button
            nativeButton={false}
            variant="link"
            size="sm"
            render={<Link to="/transactions" />}
          >
            View all
          </Button>
        </CardAction>
      }
    >
      {isEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>No transactions yet</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DashboardLiveDataGridScrollTable />
      )}
    </DashboardLiveDataGrid>
  );
};
