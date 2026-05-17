import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import { CardBalancesActionCell } from '@/components/dashboard/card-balances/CardBalancesActionCell';
import { CardBalancesBalanceCell } from '@/components/dashboard/card-balances/CardBalancesBalanceCell';
import { CardBalancesBreakdownCell } from '@/components/dashboard/card-balances/CardBalancesBreakdownCell';
import { CardBalancesCardCell } from '@/components/dashboard/card-balances/CardBalancesCardCell';
import { CardBalancesDueCell } from '@/components/dashboard/card-balances/CardBalancesDueCell';
import { CardBalancesOwnerCell } from '@/components/dashboard/card-balances/CardBalancesOwnerCell';
import { SettlementStatusBadge } from '@/components/dashboard/card-balances/SettlementStatusBadge';

/** Sketch 006 / grid-structure-and-density.md column order */
export const buildCardBalancesColumns = (
  onSettleClick: CardBalancesSettleClickHandler
): ColumnDef<SettlementAccountRow>[] => [
  {
    id: 'card',
    accessorFn: (row) => row.account.name,
    enableSorting: false,
    header: 'Card',
    size: 140,
    meta: {
      headerClassName: 'min-w-[140px]',
      cellClassName: 'min-w-[140px]',
      skeleton: <Skeleton className="h-4 w-24 motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => <CardBalancesCardCell account={row.original.account} />,
  },
  {
    id: 'owner',
    enableSorting: false,
    header: 'Owner',
    size: 100,
    meta: {
      headerClassName: 'min-w-[100px]',
      cellClassName: 'min-w-[100px]',
      skeleton: <Skeleton className="h-4 w-16 motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => <CardBalancesOwnerCell members={row.original.members} />,
  },
  {
    id: 'balance',
    accessorFn: (row) => row.totalBalanceCents,
    enableSorting: true,
    header: ({ column }) => (
      <div className="flex w-full justify-end">
        <DataGridColumnHeader column={column} title="Balance" />
      </div>
    ),
    size: 102,
    meta: {
      headerClassName: 'min-w-[102px] text-right',
      cellClassName: 'min-w-[102px] text-right',
      skeleton: (
        <Skeleton className="ms-auto h-4 w-[4.75rem] motion-safe:animate-pulse" />
      ),
    },
    cell: ({ row }) => (
      <CardBalancesBalanceCell
        totalBalanceCents={row.original.totalBalanceCents}
      />
    ),
  },
  {
    id: 'due',
    accessorFn: (row) => row.dueDate,
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const av = rowA.original.dueDate;
      const bv = rowB.original.dueDate;
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return av.localeCompare(bv);
    },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Due" />
    ),
    size: 74,
    meta: {
      headerClassName: 'min-w-[74px]',
      cellClassName: 'min-w-[74px]',
      skeleton: <Skeleton className="h-4 w-12 motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => <CardBalancesDueCell dueDate={row.original.dueDate} />,
  },
  {
    id: 'status',
    enableSorting: false,
    header: 'Status',
    size: 100,
    meta: {
      headerClassName: 'min-w-[100px]',
      cellClassName: 'min-w-[100px]',
      skeleton: (
        <Skeleton className="h-5 w-16 rounded-full motion-safe:animate-pulse" />
      ),
    },
    cell: ({ row }) => <SettlementStatusBadge status={row.original.status} />,
  },
  {
    id: 'breakdown',
    enableSorting: false,
    header: 'Split by member',
    size: 320,
    meta: {
      headerClassName: 'min-w-[280px]',
      cellClassName: 'min-w-[280px]',
      skeleton: <Skeleton className="h-10 w-full motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => <CardBalancesBreakdownCell account={row.original} />,
  },
  {
    id: 'action',
    enableSorting: false,
    header: 'Action',
    size: 124,
    meta: {
      headerClassName: 'w-[124px]',
      cellClassName: 'w-[124px]',
      skeleton: (
        <Skeleton className="h-8 w-[7.5rem] motion-safe:animate-pulse" />
      ),
    },
    cell: ({ row }) => (
      <CardBalancesActionCell
        account={row.original}
        onSettleClick={onSettleClick}
      />
    ),
  },
];
