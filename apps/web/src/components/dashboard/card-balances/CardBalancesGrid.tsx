import { useMemo } from 'react';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { Text } from '@ploutizo/ui/components/text';
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

  // ReUI composition: DataGrid → DataGridContainer → DataGridScrollArea → DataGridTable
  // (same as AccountsTable / TransactionsTable). ScrollArea bounds horizontal overflow.
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <Text as="h2" variant="h3">
          Card Balances
        </Text>
      </div>
      {accounts.length === 0 && !isLoading ? (
        <CardBalancesEmpty />
      ) : (
        <DataGrid
          table={table}
          recordCount={accounts.length}
          isLoading={isLoading}
          tableLayout={{ width: 'auto' }}
          tableClassNames={{
            // group/row enables Tailwind group-hover/row:opacity-100 on the Settle button.
            // RESEARCH Pattern 3 — verified against data-grid-table.tsx bodyRow class application.
            bodyRow: 'group/row',
          }}
        >
          <DataGridContainer border={false} className="min-w-0">
            <DataGridScrollArea className="[&_[data-slot='scroll-area-viewport']]:overscroll-contain">
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
        </DataGrid>
      )}
    </div>
  );
};
