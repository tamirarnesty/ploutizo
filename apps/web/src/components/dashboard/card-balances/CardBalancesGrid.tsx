import { useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Text } from '@ploutizo/ui/components/text';
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import type { CardBalancesGridProps } from '@/components/dashboard/card-balances/types';
import { buildCardBalancesColumns } from '@/components/dashboard/card-balances/buildCardBalancesColumns';
import { CardBalancesGridFooter } from '@/components/dashboard/card-balances/CardBalancesGridFooter';
import { CardBalancesEmpty } from '@/components/dashboard/card-balances/CardBalancesEmpty';
import type { SortingState } from '@tanstack/react-table';

export type { CardBalancesGridProps } from '@/components/dashboard/card-balances/types';

export const CardBalancesGrid = ({
  accounts,
  isLoading,
  onSettleClick,
}: CardBalancesGridProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => buildCardBalancesColumns(onSettleClick),
    [onSettleClick]
  );

  const table = useReactTable({
    data: accounts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const balanceTotalCents = useMemo(
    () => accounts.reduce((sum, row) => sum + row.totalBalanceCents, 0),
    [accounts]
  );

  const footer =
    accounts.length === 0 ? undefined : (
      <CardBalancesGridFooter balanceTotalCents={balanceTotalCents} />
    );

  return (
    <Card className="gap-0 py-0">
      {/*
       CardHeader is grid+gap; `space-y-*` on peers stacks with gap. Override base [.border-b]:pb-4.
      */}
      <CardHeader className="gap-0 border-b border-border px-3.5 pt-3 [&.border-b]:pb-3">
        <div className="flex w-full min-w-0 flex-col gap-1">
          <CardTitle className="text-lg leading-tight">Card Balances</CardTitle>
          <Text variant="caption">All time</Text>
        </div>
      </CardHeader>
      {accounts.length === 0 && !isLoading ? (
        <CardBalancesEmpty />
      ) : (
        <CardContent className="p-0">
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
            <DataGridContainer border={false} className="min-w-0">
              <DataGridScrollArea className="**:data-[slot='scroll-area-viewport']:overscroll-contain">
                <DataGridTable footerContent={footer} />
              </DataGridScrollArea>
            </DataGridContainer>
          </DataGrid>
        </CardContent>
      )}
    </Card>
  );
};
