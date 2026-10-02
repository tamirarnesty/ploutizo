import { useCallback, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Button } from '@ploutizo/ui/components/button';
import { CardAction, CardContent } from '@ploutizo/ui/components/card';
import { DataGrid } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { Text } from '@ploutizo/ui/components/text';
import { DASHBOARD_RECENT_TRANSACTIONS_PARAMS } from '@/lib/data-access/transactions/dashboardRecentTransactions';
import { useGetTransactions } from '@/lib/data-access/transactions';
import { usePreloadLucideIcons } from '@/components/categories/usePreloadLucideIcons';
import { DashboardLiveCard } from '@/components/dashboard/DashboardLiveCard';
import { PAGINATED_DATA_GRID_SCROLL_ORIENTATION } from '@/components/data-grid/dataGridSharedLayout';
import { buildRecentTransactionColumns } from '@/components/transactions/transactionColumnFactories';

export const RecentTransactionsCard = () => {
  const { data, isLoading, isError, isFetching } = useGetTransactions(
    DASHBOARD_RECENT_TRANSACTIONS_PARAMS
  );

  const rows = data?.data ?? [];
  const hasLoadFailure = isError && data === undefined;
  const isBusy = isLoading || (hasLoadFailure && isFetching);
  const showError = hasLoadFailure && !isFetching;
  const isEmpty = !showError && !isBusy && rows.length === 0;

  const onOpenOriginal = useCallback((_id: string) => {}, []);

  const columns = useMemo(
    () => buildRecentTransactionColumns(onOpenOriginal),
    [onOpenOriginal]
  );

  const categoryIcons = useMemo(
    () => rows.map((transaction) => transaction.categoryIcon),
    [rows]
  );
  usePreloadLucideIcons(categoryIcons);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const skeletonRowCount = DASHBOARD_RECENT_TRANSACTIONS_PARAMS.limit;

  return (
    <DataGrid
      table={table}
      recordCount={isBusy ? skeletonRowCount : rows.length}
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
