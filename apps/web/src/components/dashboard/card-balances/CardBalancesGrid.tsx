import { useMemo } from 'react';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import type { CardBalancesGridProps } from '@/components/dashboard/card-balances/types';
import { buildCardBalancesColumns } from '@/components/dashboard/card-balances/buildCardBalancesColumns';
import { CardBalancesEmpty } from '@/components/dashboard/card-balances/CardBalancesEmpty';

export type { CardBalancesGridProps } from '@/components/dashboard/card-balances/types';

export const CardBalancesGrid = ({
  accounts,
  isLoading,
  onSettleClick,
}: CardBalancesGridProps) => {
  const columns = useMemo(
    () => buildCardBalancesColumns(onSettleClick),
    [onSettleClick]
  );
  const table = useReactTable({
    data: accounts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-border px-4 py-4">
        <CardTitle>Card Balances</CardTitle>
      </CardHeader>
      {accounts.length === 0 && !isLoading ? (
        <CardBalancesEmpty />
      ) : (
        <CardContent className="p-0">
          <DataGrid
            table={table}
            recordCount={accounts.length}
            isLoading={isLoading}
            tableLayout={{ width: 'auto' }}
            tableClassNames={{
              bodyRow: 'group/row',
            }}
          >
            <DataGridContainer border={false} className="min-w-0">
              <DataGridScrollArea className="[&_[data-slot='scroll-area-viewport']]:overscroll-contain">
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
          </DataGrid>
        </CardContent>
      )}
    </Card>
  );
};
