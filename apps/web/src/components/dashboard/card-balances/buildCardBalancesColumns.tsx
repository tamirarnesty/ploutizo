import { Skeleton } from '@ploutizo/ui/components/skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { CardBalancesGridProps } from '@/components/dashboard/card-balances/types';
import { CardBalancesBalanceCell } from '@/components/dashboard/card-balances/CardBalancesBalanceCell';
import { CardBalancesBreakdownCell } from '@/components/dashboard/card-balances/CardBalancesBreakdownCell';
import { CardBalancesCardCell } from '@/components/dashboard/card-balances/CardBalancesCardCell';
import { CardBalancesDueCell } from '@/components/dashboard/card-balances/CardBalancesDueCell';
import { CardBalancesOwnerCell } from '@/components/dashboard/card-balances/CardBalancesOwnerCell';
import { SettlementStatusBadge } from '@/components/dashboard/card-balances/SettlementStatusBadge';

export const buildCardBalancesColumns = (
  onSettleClick: CardBalancesGridProps['onSettleClick']
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
    enableSorting: false,
    header: 'Balance',
    size: 90,
    meta: {
      headerClassName: 'min-w-[90px] text-right',
      cellClassName: 'min-w-[90px] text-right',
      skeleton: (
        <Skeleton className="ms-auto h-4 w-16 motion-safe:animate-pulse" />
      ),
    },
    cell: ({ row }) => (
      <CardBalancesBalanceCell
        totalBalanceCents={row.original.totalBalanceCents}
      />
    ),
  },
  {
    id: 'breakdown',
    enableSorting: false,
    header: 'Breakdown by member',
    size: 320,
    meta: {
      headerClassName: 'min-w-[280px]',
      cellClassName: 'min-w-[280px]',
      skeleton: <Skeleton className="h-12 w-full motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => (
      <CardBalancesBreakdownCell
        account={row.original}
        onSettleClick={onSettleClick}
      />
    ),
  },
  {
    id: 'due',
    enableSorting: false,
    header: 'Due',
    size: 70,
    meta: {
      headerClassName: 'min-w-[70px]',
      cellClassName: 'min-w-[70px]',
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
];
