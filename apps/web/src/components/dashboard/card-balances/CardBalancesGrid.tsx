import { useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { CardContent, CardFooter } from '@ploutizo/ui/components/card';
import { DataGrid } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { DataGridPagination } from '@ploutizo/ui/components/reui/data-grid/data-grid-pagination';
import type { CardBalancesGridProps } from '@/components/dashboard/card-balances/types';
import { buildCardBalancesColumns } from '@/components/dashboard/card-balances/buildCardBalancesColumns';
import { CardBalancesEmpty } from '@/components/dashboard/card-balances/CardBalancesEmpty';
import { CardBalancesTotal } from '@/components/dashboard/card-balances/CardBalancesTotal';
import { DashboardLiveCard } from '@/components/dashboard/DashboardLiveCard';
import { usePersistedPageSize } from '@/hooks/persistedPageSize';
import { CARD_BALANCES_PAGE_SIZE_OPTIONS } from '@/lib/prefs/pageSizeConfig';
import {
  DATA_GRID_PAGINATION_ROW_CLASSNAME,
  PAGINATED_DATA_GRID_SCROLL_ORIENTATION,
} from '@/components/data-grid/dataGridSharedLayout';
import type { SortingState } from '@tanstack/react-table';

export const CardBalancesGrid = ({
  rows,
  isLoading,
  isError,
  onSettleClick,
}: CardBalancesGridProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { pagination, setPagination } = usePersistedPageSize('card-balances');

  const columns = useMemo(
    () => buildCardBalancesColumns(onSettleClick),
    [onSettleClick]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  /** Card balances total: credit nets against amounts owed. */
  const balanceTotalCents = useMemo(
    () => rows.reduce((sum, row) => sum + row.totalBalanceCents, 0),
    [rows]
  );

  const isEmpty = rows.length === 0 && !isLoading;

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      isLoading={isLoading}
      tableLayout={{
        width: 'auto',
        dense: true,
      }}
      tableClassNames={{
        bodyRow: 'group/row',
      }}
    >
      <DashboardLiveCard
        title="Card Balances"
        action={
          isError || isEmpty ? undefined : (
            <CardBalancesTotal
              cents={balanceTotalCents}
              isLoading={isLoading}
            />
          )
        }
        isLoading={isLoading}
        isError={isError}
        errorMessage="Couldn’t load card balances. Check your connection and try again."
      >
        {isEmpty ? (
          <CardBalancesEmpty />
        ) : (
          <>
            <CardContent className="border-b px-0">
              <DataGridScrollArea
                orientation={PAGINATED_DATA_GRID_SCROLL_ORIENTATION}
              >
                <DataGridTable />
              </DataGridScrollArea>
            </CardContent>
            <CardFooter className="border-none bg-transparent px-3.5 py-2">
              <DataGridPagination
                sizes={[...CARD_BALANCES_PAGE_SIZE_OPTIONS]}
                className={DATA_GRID_PAGINATION_ROW_CLASSNAME}
              />
            </CardFooter>
          </>
        )}
      </DashboardLiveCard>
    </DataGrid>
  );
};
