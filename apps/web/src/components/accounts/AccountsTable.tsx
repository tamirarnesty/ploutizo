import { useMemo } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridPagination } from '@ploutizo/ui/components/reui/data-grid/data-grid-pagination';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import type { ColumnDef } from '@tanstack/react-table';
import type { Account } from '@ploutizo/types';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  chequing: 'Chequing',
  savings: 'Savings',
  credit_card: 'Credit Card',
  prepaid_cash: 'Prepaid / Cash',
  e_transfer: 'e-Transfer',
  investment: 'Investment',
  other: 'Other',
};

interface AccountsTableProps {
  accounts: Account[];
  isLoading: boolean;
  onRowClick: (account: Account) => void;
  onAddClick: () => void;
}

export const AccountsTable = ({
  accounts,
  isLoading,
  onRowClick,
  onAddClick,
}: AccountsTableProps) => {
  const columns = useMemo<ColumnDef<Account>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        size: 200,
        meta: {
          headerClassName: 'min-w-[160px]',
          cellClassName: 'min-w-[160px]',
          skeleton: <Skeleton className="h-4 w-32" />,
        },
        cell: ({ row }) => (
          <span className="text-sm font-semibold">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 140,
        meta: {
          headerClassName: 'min-w-[120px]',
          cellClassName: 'min-w-[120px]',
          skeleton: <Skeleton className="h-4 w-24" />,
        },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {ACCOUNT_TYPE_LABELS[row.original.type] ?? row.original.type}
          </span>
        ),
      },
      {
        accessorKey: 'institution',
        header: 'Institution',
        size: 160,
        meta: {
          headerClassName: 'min-w-[130px]',
          cellClassName: 'min-w-[130px]',
          skeleton: <Skeleton className="h-4 w-28" />,
        },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.institution ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'lastFour',
        header: 'Last 4',
        size: 100,
        meta: {
          headerClassName: 'min-w-[80px] whitespace-nowrap',
          cellClassName: 'min-w-[80px]',
          skeleton: <Skeleton className="h-4 w-12" />,
        },
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">
            {row.original.lastFour ?? '—'}
          </span>
        ),
      },
      {
        id: 'owners',
        header: 'Owners',
        size: 120,
        meta: {
          headerClassName: 'min-w-[90px]',
          cellClassName: 'min-w-[90px]',
          skeleton: <Skeleton className="h-4 w-20" />,
        },
        cell: () => <span className="text-sm text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'archivedAt',
        header: 'Status',
        size: 100,
        meta: {
          headerClassName: 'min-w-[80px]',
          cellClassName: 'min-w-[80px]',
          skeleton: <Skeleton className="h-5 w-16 rounded-full" />,
        },
        cell: ({ row }) =>
          row.original.archivedAt ? (
            <Badge variant="secondary">Archived</Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-green-300 text-green-700"
            >
              Active
            </Badge>
          ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: accounts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!isLoading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
        <Text variant="body-sm" className="font-medium">No accounts yet</Text>
        <Text variant="body-sm" className="max-w-xs text-muted-foreground">
          Add your first account to start tracking transactions.
        </Text>
        <Button type="button" onClick={onAddClick} className="mt-2">
          Add account
        </Button>
      </div>
    );
  }

  return (
    <DataGrid
      table={table}
      recordCount={accounts.length}
      isLoading={isLoading}
      onRowClick={onRowClick}
      emptyMessage="No accounts yet"
      tableLayout={{ width: 'auto' }}
    >
      <div className="w-full space-y-2.5">
        <DataGridContainer>
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </DataGridContainer>
        {/*
         * DataGridPagination base styles stack to flex-col on mobile, swapping
         * the two sections' visual order via `order-1`/`order-2`. These
         * overrides force a single-row layout at all sizes:
         *   - `flex-row`                    always row (overrides base flex-col)
         *   - `[&>div:first-child]:order-1` lock rows-per-page to left
         *   - `[&>div:last-child]:order-2`  lock info/nav to right
         *   - `pb-0` / `pt-0`               remove mobile-only stack spacing
         *   - `[&_[role='combobox']]:w-16`  widen dropdown for 2-digit page sizes
         */}
        <DataGridPagination className="flex-row [&>div:first-child]:order-1 [&>div:first-child]:pb-0 [&>div:last-child]:order-2 [&>div:last-child]:flex-row [&>div:last-child]:pt-0 [&_[role='combobox']]:w-16" />
      </div>
    </DataGrid>
  );
};
