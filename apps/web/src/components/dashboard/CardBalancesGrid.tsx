import { useMemo } from 'react';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { Progress } from '@ploutizo/ui/components/progress';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  SettlementAccountRow,
  SettlementMemberRow,
} from '@ploutizo/types';
import { UserAvatar } from '@/components/members/UserAvatar';
import { formatCurrency } from '@/lib/formatCurrency';
import { getMemberColorSlot } from '@/lib/memberColors';

export interface CardBalancesGridProps {
  accounts: SettlementAccountRow[];
  isLoading: boolean;
  onSettleClick: (
    account: SettlementAccountRow,
    member: SettlementMemberRow
  ) => void;
}

const formatDueShort = (iso: string | null): string => {
  if (!iso) return '—'; // em-dash
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
};

const buildColumns = (
  onSettleClick: CardBalancesGridProps['onSettleClick']
): ColumnDef<SettlementAccountRow>[] => [
  // CARD
  {
    id: 'card',
    accessorFn: (row) => row.account.name,
    enableSorting: false,
    header: () => 'CARD',
    size: 140,
    meta: {
      headerClassName: 'min-w-[140px]',
      cellClassName: 'min-w-[140px]',
      skeleton: <Skeleton className="h-4 w-24 motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-muted text-xs font-semibold uppercase"
          aria-hidden="true"
        >
          {row.original.account.name.slice(0, 2)}
        </div>
        <Text
          as="span"
          variant="body"
          className="min-w-0 truncate font-semibold"
        >
          {row.original.account.name}
        </Text>
      </div>
    ),
  },
  // OWNER
  {
    id: 'owner',
    enableSorting: false,
    header: () => 'OWNER',
    size: 100,
    meta: {
      headerClassName: 'min-w-[100px]',
      cellClassName: 'min-w-[100px]',
      skeleton: <Skeleton className="h-4 w-16 motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => {
      const nonZero = row.original.members.filter((m) => m.balanceCents !== 0);
      if (nonZero.length === 0)
        return (
          <Text variant="caption" className="text-muted-foreground">
            —
          </Text>
        );
      if (nonZero.length === 1) {
        return (
          <Text as="span" variant="body-sm" className="min-w-0 truncate">
            {nonZero[0]?.member.name ?? '—'}
          </Text>
        );
      }
      return (
        <Text as="span" variant="body-sm" className="min-w-0 truncate">
          Shared
        </Text>
      );
    },
  },
  // BALANCE
  {
    id: 'balance',
    accessorFn: (row) => row.totalBalanceCents,
    enableSorting: false,
    header: () => 'BALANCE',
    size: 90,
    meta: {
      headerClassName: 'min-w-[90px] text-right',
      cellClassName: 'min-w-[90px] text-right',
      skeleton: <Skeleton className="h-4 w-16 motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => {
      const cents = row.original.totalBalanceCents;
      const isCredit = cents < 0;
      return (
        <Text
          as="span"
          variant="body"
          className={cn(
            'font-sans font-semibold tabular-nums',
            isCredit ? 'text-success' : 'text-foreground'
          )}
        >
          {formatCurrency(Math.abs(cents))}
        </Text>
      );
    },
  },
  // BREAKDOWN BY MEMBER
  {
    id: 'breakdown',
    enableSorting: false,
    header: () => 'BREAKDOWN BY MEMBER',
    size: 320,
    meta: {
      headerClassName: 'min-w-[280px]',
      cellClassName: 'min-w-[280px]',
      skeleton: <Skeleton className="h-12 w-full motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => {
      const account = row.original;
      const total = Math.max(
        1,
        account.members.reduce((sum, m) => sum + Math.abs(m.balanceCents), 0)
      );
      return (
        <div className="space-y-1">
          {account.members.map((m) => {
            const slot = getMemberColorSlot(
              account.members.map((mm) => ({ id: mm.member.id })),
              m.member.id
            );
            const isCredit = m.balanceCents < 0;
            const pct = Math.round((Math.abs(m.balanceCents) / total) * 100);
            return (
              <div
                key={m.member.id}
                className="flex min-w-0 items-center gap-2"
              >
                <UserAvatar
                  name={m.member.name}
                  imageUrl={m.member.avatarUrl}
                  size="sm"
                />
                <Progress
                  value={pct}
                  className="h-2 min-w-0 flex-1"
                  aria-label={`${m.member.name} portion`}
                />
                <Text
                  as="span"
                  variant="body-sm"
                  className={cn(
                    'shrink-0 font-sans tabular-nums',
                    isCredit ? 'text-success' : 'text-foreground'
                  )}
                >
                  {formatCurrency(Math.abs(m.balanceCents))}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Settle for ${m.member.name} on ${account.account.name}`}
                  // opacity-0 (NOT display:none) preserves tab order — RESEARCH Pitfall 1,
                  // UI-SPEC Accessibility Contract.
                  className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 focus:opacity-100"
                  onClick={() => onSettleClick(account, m)}
                  // data-color-slot references the slot so the import is used for future
                  // per-member progress fill theming (Phase 7.3).
                  data-color-slot={slot.bg}
                >
                  Settle
                </Button>
              </div>
            );
          })}
        </div>
      );
    },
  },
  // DUE
  {
    id: 'due',
    enableSorting: false,
    header: () => 'DUE',
    size: 70,
    meta: {
      headerClassName: 'min-w-[70px]',
      cellClassName: 'min-w-[70px]',
      skeleton: <Skeleton className="h-4 w-12 motion-safe:animate-pulse" />,
    },
    cell: ({ row }) => (
      <Text variant="body-sm" className="text-muted-foreground">
        {formatDueShort(row.original.dueDate)}
      </Text>
    ),
  },
  // STATUS
  {
    id: 'status',
    enableSorting: false,
    header: () => 'STATUS',
    size: 100,
    meta: {
      headerClassName: 'min-w-[100px]',
      cellClassName: 'min-w-[100px]',
      skeleton: (
        <Skeleton className="h-5 w-16 rounded-full motion-safe:animate-pulse" />
      ),
    },
    cell: ({ row }) => {
      const s = row.original.status;
      if (!s)
        return (
          <Text variant="caption" className="text-muted-foreground">
            —
          </Text>
        );
      if (s === 'due_soon') {
        return (
          <Badge
            variant="outline"
            className="rounded-full border-warning/20 bg-warning/10 font-serif text-warning-foreground"
          >
            Due Soon
          </Badge>
        );
      }
      return (
        <Badge
          variant="outline"
          className="rounded-full border-success/20 bg-success/10 font-serif text-success-foreground"
        >
          On Track
        </Badge>
      );
    },
  },
];

export const CardBalancesGrid = ({
  accounts,
  isLoading,
  onSettleClick,
}: CardBalancesGridProps) => {
  const columns = useMemo(() => buildColumns(onSettleClick), [onSettleClick]);
  const table = useReactTable({
    data: accounts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <Text as="h2" variant="h3">
          Card Balances
        </Text>
      </div>
      {accounts.length === 0 && !isLoading ? (
        <div className="p-6 text-center">
          <Text variant="body" className="font-semibold">
            No credit card accounts
          </Text>
          <Text variant="caption" className="mt-1 text-muted-foreground">
            Add a credit card account to see balance breakdowns.
          </Text>
        </div>
      ) : (
        <DataGrid
          table={table}
          recordCount={accounts.length}
          isLoading={isLoading}
          tableLayout={{ headerSticky: false }}
          tableClassNames={{
            // group/row enables Tailwind group-hover/row:opacity-100 on the Settle button.
            // RESEARCH Pattern 3 — verified against data-grid-table.tsx bodyRow class application.
            bodyRow: 'group/row',
          }}
        >
          <DataGridTable />
        </DataGrid>
      )}
    </div>
  );
};
