import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useReactTable } from '@tanstack/react-table';
import { Button } from '@ploutizo/ui/components/button';
import { CardAction, CardContent } from '@ploutizo/ui/components/card';
import { DataGrid } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { Text } from '@ploutizo/ui/components/text';
import type { TransactionRow } from '@ploutizo/validators';
import { DASHBOARD_RECENT_TRANSACTIONS_PARAMS } from '@/lib/data-access/transactions/dashboardRecentTransactions';
import type { DashboardRecentTransactionsQuery } from '@/lib/data-access/transactions/dashboardRecentTransactions';
import { usePreloadLucideIcons } from '@/components/categories/usePreloadLucideIcons';
import { DashboardLiveCard } from '@/components/dashboard/DashboardLiveCard';
import { getDashboardQueryLiveState } from '@/components/dashboard/dashboardQueryLiveState';
import { dataGridCoreRowModel } from '@/components/data-grid/dataGridTableModels';
import { PAGINATED_DATA_GRID_SCROLL_ORIENTATION } from '@/components/data-grid/dataGridSharedLayout';
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
    <DataGrid
      table={table}
      recordCount={isBusy ? recentLimit : rows.length}
      isLoading={isBusy}
      tableLayout={{
        width: 'auto',
        dense: true,
      }}
    >
      <DashboardLiveCard
        title="Recent transactions"
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
        isLoading={isBusy}
        isError={showError}
        errorMessage="Couldn’t load recent transactions. Check your connection and try again."
      >
        {isEmpty ? (
          <Text
            as="p"
            variant="body-sm"
            className="px-3.5 py-6 text-center text-muted-foreground"
          >
            No transactions yet
          </Text>
        ) : (
          <CardContent className="border-b px-0 py-0">
            <DataGridScrollArea
              orientation={PAGINATED_DATA_GRID_SCROLL_ORIENTATION}
            >
              <DataGridTable />
            </DataGridScrollArea>
          </CardContent>
        )}
      </DashboardLiveCard>
    </DataGrid>
  );
};
