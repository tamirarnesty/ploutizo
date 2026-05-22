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
import type { Account } from '@ploutizo/types';
import {
  DATA_GRID_PAGINATION_ROW_CLASSNAME,
  PAGINATED_DATA_GRID_SCROLL_ORIENTATION,
} from '@/components/data-grid/dataGridSharedLayout';
import { MemberAvatarGroup } from '@/components/members/MemberAvatarGroup';
import { usePersistedPageSize } from '@/hooks/persistedPageSize';
import { useEffectiveTablePageSize } from '@/hooks/useEffectiveTablePageSize';
import type { ColumnDef } from '@tanstack/react-table';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  chequing: 'Chequing',
  savings: 'Savings',
  credit_card: 'Credit Card',
  prepaid_cash: 'Prepaid / Cash',
  e_transfer: 'e-Transfer',
  investment: 'Investment',
  other: 'Other',
};

const countClientPageRows = (
  totalRows: number,
  pageIndex: number,
  pageSize: number
): number => {
  if (totalRows === 0) return 0;
  const remaining = totalRows - pageIndex * pageSize;
  return Math.min(pageSize, Math.max(0, remaining));
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
  const { pagination, setPagination } = usePersistedPageSize('accounts');

  const loadedVisibleRowCount = isLoading
    ? 0
    : countClientPageRows(
        accounts.length,
        pagination.pageIndex,
        pagination.pageSize
      );

  const effectivePageSize = useEffectiveTablePageSize(
    'accounts',
    pagination.pageSize,
    loadedVisibleRowCount,
    isLoading
  );

  const tablePagination = useMemo(
    () =>
      effectivePageSize === pagination.pageSize
        ? pagination
        : { ...pagination, pageSize: effectivePageSize },
    [pagination, effectivePageSize]
  );

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
          <Text as="span" variant="body-sm" className="font-semibold">
            {row.original.name}
          </Text>
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
          <Text as="span" variant="body-sm" className="text-muted-foreground">
            {ACCOUNT_TYPE_LABELS[row.original.type] ?? row.original.type}
          </Text>
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
          <Text as="span" variant="body-sm" className="text-muted-foreground">
            {row.original.institution ?? '—'}
          </Text>
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
          <Text
            as="span"
            variant="body-sm"
            className="font-mono text-muted-foreground"
          >
            {row.original.lastFour ?? '—'}
          </Text>
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
        cell: ({ row }) => (
          <MemberAvatarGroup
            members={row.original.owners.map((o) => ({
              id: o.id,
              name: o.displayName,
              imageUrl: o.imageUrl,
            }))}
            withTooltips
          />
        ),
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
    []
  );

  const table = useReactTable({
    data: accounts,
    columns,
    state: { pagination: tablePagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!isLoading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
        <Text variant="body-sm" className="font-medium">
          No accounts yet
        </Text>
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
          <DataGridScrollArea
            orientation={PAGINATED_DATA_GRID_SCROLL_ORIENTATION}
          >
            <DataGridTable />
          </DataGridScrollArea>
        </DataGridContainer>
        <DataGridPagination className={DATA_GRID_PAGINATION_ROW_CLASSNAME} />
      </div>
    </DataGrid>
  );
};
