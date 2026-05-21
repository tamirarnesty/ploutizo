import {
  Activity,
  CalendarClock,
  ChartPie,
  CreditCard,
  DollarSign,
  Users,
} from 'lucide-react';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import { CardBalancesActionCell } from '@/components/dashboard/card-balances/CardBalancesActionCell';
import { CardBalancesBalanceCell } from '@/components/dashboard/card-balances/CardBalancesBalanceCell';
import { CardBalancesBreakdownCell } from '@/components/dashboard/card-balances/CardBalancesBreakdownCell';
import { CardBalancesCardCell } from '@/components/dashboard/card-balances/CardBalancesCardCell';
import { CardBalancesDueCell } from '@/components/dashboard/card-balances/CardBalancesDueCell';
import { CardBalancesOwnerCell } from '@/components/dashboard/card-balances/CardBalancesOwnerCell';
import { SettlementStatusBadge } from '@/components/dashboard/card-balances/SettlementStatusBadge';
import {
  RightAlignedCell,
  RightAlignedColumnHeader,
} from '@/components/dashboard/card-balances/RightAlignedColumnHeader';
import type { ColumnDef } from '@tanstack/react-table';

const columnHeaderIcon = (Icon: typeof CreditCard) => (
  <Icon aria-hidden="true" />
);

/** Sketch 006 / grid-structure-and-density.md column order */
export const buildCardBalancesColumns = (
  onSettleClick: CardBalancesSettleClickHandler
): ColumnDef<SettlementAccountRow>[] => [
  {
    id: 'card',
    accessorFn: (row) => row.account.name,
    enableSorting: false,
    header: ({ column }) => (
      <DataGridColumnHeader
        column={column}
        title="Card"
        icon={columnHeaderIcon(CreditCard)}
      />
    ),
    size: 166,
    meta: {
      headerClassName: 'min-w-[160px]',
      cellClassName: 'min-w-[160px]',
      skeleton: <Skeleton className="h-4 w-28 motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => <CardBalancesCardCell account={row.original.account} />,
  },
  {
    id: 'owner',
    enableSorting: false,
    header: ({ column }) => (
      <DataGridColumnHeader
        column={column}
        title="Owner"
        icon={columnHeaderIcon(Users)}
      />
    ),
    size: 92,
    meta: {
      headerClassName: 'min-w-[92px]',
      cellClassName: 'min-w-[92px]',
      skeleton: <Skeleton className="h-4 w-16 motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => (
      <CardBalancesOwnerCell owners={row.original.account.owners} />
    ),
  },
  {
    id: 'balance',
    accessorFn: (row) => row.totalBalanceCents,
    enableSorting: true,
    header: ({ column }) => (
      <RightAlignedColumnHeader
        column={column}
        title="Balance"
        icon={columnHeaderIcon(DollarSign)}
      />
    ),
    size: 112,
    meta: {
      headerClassName: 'min-w-[112px]',
      cellClassName: 'min-w-[112px]',
      skeleton: (
        <Skeleton className="ms-auto h-4 w-16 motion-safe:animate-pulse" />
      ),
    },
    cell: ({ row }) => (
      <RightAlignedCell>
        <CardBalancesBalanceCell
          totalBalanceCents={row.original.totalBalanceCents}
        />
      </RightAlignedCell>
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
      <RightAlignedColumnHeader
        column={column}
        title="Due"
        icon={columnHeaderIcon(CalendarClock)}
      />
    ),
    size: 92,
    meta: {
      headerClassName: 'min-w-[92px]',
      cellClassName: 'min-w-[92px]',
      skeleton: (
        <Skeleton className="ms-auto h-4 w-12 motion-safe:animate-pulse" />
      ),
    },
    cell: ({ row }) => (
      <RightAlignedCell>
        <CardBalancesDueCell dueDate={row.original.dueDate} />
      </RightAlignedCell>
    ),
  },
  {
    id: 'status',
    enableSorting: false,
    header: ({ column }) => (
      <DataGridColumnHeader
        column={column}
        title="Status"
        icon={columnHeaderIcon(Activity)}
      />
    ),
    size: 104,
    meta: {
      headerClassName: 'min-w-[104px]',
      cellClassName: 'min-w-[104px]',
      skeleton: (
        <Skeleton className="h-5 w-16 rounded-full motion-safe:animate-pulse" />
      ),
    },
    cell: ({ row }) => <SettlementStatusBadge status={row.original.status} />,
  },
  {
    id: 'breakdown',
    enableSorting: false,
    header: ({ column }) => (
      <DataGridColumnHeader
        column={column}
        title="Attribution"
        icon={columnHeaderIcon(ChartPie)}
      />
    ),
    size: 374,
    meta: {
      headerClassName: 'min-w-[360px]',
      cellClassName: 'min-w-[360px]',
      skeleton: <Skeleton className="h-10 w-full motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => <CardBalancesBreakdownCell account={row.original} />,
  },
  {
    id: 'action',
    enableSorting: false,
    header: () => <span className="sr-only">Settle</span>,
    size: 48,
    meta: {
      headerClassName: 'w-12 max-w-12',
      cellClassName: 'w-12 max-w-12 pe-1',
    },
    cell: ({ row }) => (
      <CardBalancesActionCell
        account={row.original}
        onSettleClick={onSettleClick}
      />
    ),
  },
];
