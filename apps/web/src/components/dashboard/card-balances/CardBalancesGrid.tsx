import { useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Text } from '@ploutizo/ui/components/text';
import { DataGrid } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { DataGridPagination } from '@ploutizo/ui/components/reui/data-grid/data-grid-pagination';
import type { CardBalancesGridProps } from '@/components/dashboard/card-balances/types';
import { buildCardBalancesColumns } from '@/components/dashboard/card-balances/buildCardBalancesColumns';
import { CardBalancesGridFooter } from '@/components/dashboard/card-balances/CardBalancesGridFooter';
import { CardBalancesEmpty } from '@/components/dashboard/card-balances/CardBalancesEmpty';
import {
  CARD_BALANCES_PAGE_SIZE_OPTIONS,
  useCardBalancesPageSize,
} from '@/components/dashboard/card-balances/useCardBalancesPageSize';
import {
  DATA_GRID_PAGINATION_ROW_CLASSNAME,
  PAGINATED_DATA_GRID_SCROLL_ORIENTATION,
} from '@/components/data-grid/dataGridSharedLayout';
import type { SortingState } from '@tanstack/react-table';

export type { CardBalancesGridProps } from '@/components/dashboard/card-balances/types';

const CardBalancesGridHeader = () => (
  <CardHeader className="border-b px-3.5 pt-3 [.border-b]:pb-3">
    <CardTitle className="text-lg leading-tight">Card Balances</CardTitle>
    <Text variant="caption">All time</Text>
  </CardHeader>
);

export const CardBalancesGrid = ({
  accounts,
  isLoading,
  onSettleClick,
}: CardBalancesGridProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { pagination, setPagination } = useCardBalancesPageSize();

  const columns = useMemo(
    () => buildCardBalancesColumns(onSettleClick),
    [onSettleClick]
  );

  const table = useReactTable({
    data: accounts,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const balanceTotalCents = useMemo(
    () => accounts.reduce((sum, row) => sum + row.totalBalanceCents, 0),
    [accounts]
  );

  const footer =
    accounts.length === 0 ? undefined : (
      <CardBalancesGridFooter balanceTotalCents={balanceTotalCents} />
    );

  if (accounts.length === 0 && !isLoading) {
    return (
      <Card className="w-full gap-0 py-0">
        <CardBalancesGridHeader />
        <CardBalancesEmpty />
      </Card>
    );
  }

  return (
    <DataGrid
      table={table}
      recordCount={accounts.length}
      isLoading={isLoading}
      tableLayout={{
        width: 'auto',
        dense: true,
      }}
      tableClassNames={{
        bodyRow: 'group/row',
      }}
    >
      <Card className="w-full gap-0 py-0">
        <CardBalancesGridHeader />
        <CardContent className="border-b px-0">
          <DataGridScrollArea
            orientation={PAGINATED_DATA_GRID_SCROLL_ORIENTATION}
          >
            <DataGridTable footerContent={footer} />
          </DataGridScrollArea>
        </CardContent>
        <CardFooter className="border-none bg-transparent px-3.5 py-2">
          <DataGridPagination
            sizes={[...CARD_BALANCES_PAGE_SIZE_OPTIONS]}
            className={DATA_GRID_PAGINATION_ROW_CLASSNAME}
          />
        </CardFooter>
      </Card>
    </DataGrid>
  );
};
