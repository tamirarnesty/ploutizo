import { useMemo, useState } from 'react';
import {
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { CardFooter } from '@ploutizo/ui/components/card';
import { DataGridPagination } from '@ploutizo/ui/components/reui/data-grid/data-grid-pagination';
import type { CardBalancesGridProps } from '@/components/dashboard/card-balances/types';
import { buildCardBalancesColumns } from '@/components/dashboard/card-balances/buildCardBalancesColumns';
import { CardBalancesEmpty } from '@/components/dashboard/card-balances/CardBalancesEmpty';
import { CardBalancesTotal } from '@/components/dashboard/card-balances/CardBalancesTotal';
import {
  DashboardLiveDataGrid,
  DashboardLiveDataGridScrollTable,
} from '@/components/dashboard/DashboardLiveDataGrid';
import { usePersistedPageSize } from '@/hooks/persistedPageSize';
import { CARD_BALANCES_PAGE_SIZE_OPTIONS } from '@/lib/prefs/pageSizeConfig';
import { DATA_GRID_PAGINATION_ROW_CLASSNAME } from '@/components/data-grid/dataGridSharedLayout';
import { dataGridCoreRowModel } from '@/components/data-grid/dataGridTableModels';
import type { SortingState } from '@tanstack/react-table';

export const CardBalancesGrid = ({
  rows,
  isLoading,
  isError,
  onSettleClick,
  className,
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
    getCoreRowModel: dataGridCoreRowModel,
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
    <DashboardLiveDataGrid
      table={table}
      recordCount={rows.length}
      isLoading={isLoading}
      title="Card Balances"
      errorResource="card balances"
      isError={isError}
      action={
        isError || isEmpty ? undefined : (
          <CardBalancesTotal cents={balanceTotalCents} isLoading={isLoading} />
        )
      }
      className={className}
      tableClassNames={{
        bodyRow: 'group/row',
      }}
    >
      {isEmpty ? (
        <CardBalancesEmpty />
      ) : (
        <>
          <DashboardLiveDataGridScrollTable cardContentClassName="border-b px-0" />
          <CardFooter className="border-none bg-transparent px-3.5 py-2">
            <DataGridPagination
              sizes={[...CARD_BALANCES_PAGE_SIZE_OPTIONS]}
              className={DATA_GRID_PAGINATION_ROW_CLASSNAME}
            />
          </CardFooter>
        </>
      )}
    </DashboardLiveDataGrid>
  );
};
