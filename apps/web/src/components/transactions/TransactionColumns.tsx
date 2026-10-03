import { Layers2, Tag, Tags, Users } from 'lucide-react';
import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header';
import { Badge } from '@ploutizo/ui/components/badge';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import { memberFullLabel } from '@ploutizo/utils';
import type { TransactionRow } from '@ploutizo/validators';
import { columnHeaderIcon } from '@/components/data-grid/columnHeaderIcon';
import { MemberAvatarGroup } from '@/components/members/MemberAvatarGroup';
import { createCoreTransactionColumnDefs } from './transactionColumnFactories';
import { TransactionRowActionsDropdown } from './TransactionRowActionMenus';
import { getTransactionRowActions } from './transactionRowActions';
import type { ColumnDef } from '@tanstack/react-table';

// Per-type badge className map (per UI-SPEC.md)
export const typeBadgeClassName: Record<string, string> = {
  expense: '',
  income:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  transfer: '',
  settlement:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  refund:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  contribution:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export const typeBadgeVariant: Record<
  string,
  'destructive' | 'secondary' | 'default' | 'outline' | undefined
> = {
  expense: 'destructive',
  transfer: 'secondary',
};

// Internal transaction types rendered at reduced opacity in type badges
const isInternalType = (t: string) =>
  ['transfer', 'settlement', 'contribution'].includes(t);

export const buildColumns = (
  setDeleteId: (id: string) => void,
  onEdit: (transaction: TransactionRow) => void,
  onOpenOriginal: (id: string) => void
): ColumnDef<TransactionRow>[] => {
  const handlers = { onEdit, onDelete: setDeleteId };
  const core = createCoreTransactionColumnDefs({
    date: { enableSorting: true },
    description: { enableSorting: false, onOpenOriginal },
    category: { enableSorting: true },
    account: { enableSorting: true },
    amount: { enableSorting: true },
  });

  return [
    core.date,
    // 2. Type
    {
      id: 'type',
      accessorKey: 'type',
      enableSorting: true,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Type"
          icon={columnHeaderIcon(Layers2)}
        />
      ),
      size: 140,
      meta: {
        headerClassName: 'min-w-[120px]',
        cellClassName: 'min-w-[120px]',
        skeleton: (
          <Skeleton className="h-5 w-16 rounded-full motion-safe:animate-pulse" />
        ),
      },
      cell: ({ row }) => {
        const type = row.original.type;
        const variant = typeBadgeVariant[type];
        const className = typeBadgeClassName[type];
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        return variant ? (
          <Badge
            variant={variant}
            className={cn(isInternalType(type) && 'opacity-60')}
          >
            {label}
          </Badge>
        ) : (
          <Badge
            className={cn(className, isInternalType(type) && 'opacity-60')}
          >
            {label}
          </Badge>
        );
      },
    },
    core.description,
    core.category,
    core.account,
    // 6. Assignees
    {
      id: 'assignees',
      enableSorting: false,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Assignees"
          icon={columnHeaderIcon(Users)}
        />
      ),
      size: 120,
      meta: {
        headerClassName: 'min-w-[100px]',
        cellClassName: 'min-w-[100px]',
        skeleton: (
          <div className="flex gap-0.5">
            <Skeleton className="h-6 w-6 rounded-full motion-safe:animate-pulse" />
            <Skeleton className="h-6 w-6 rounded-full motion-safe:animate-pulse" />
          </div>
        ),
      },
      cell: ({ row }) => (
        <MemberAvatarGroup
          members={row.original.assignees.map((a) => ({
            id: a.memberId,
            name: memberFullLabel(a),
            imageUrl: a.imageUrl,
          }))}
          withTooltips
          emptyFallback={null}
        />
      ),
    },
    // 7. Tags
    {
      id: 'tags',
      enableSorting: false,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Tags"
          icon={columnHeaderIcon(Tags)}
        />
      ),
      size: 160,
      meta: {
        headerClassName: 'min-w-[140px]',
        cellClassName: 'min-w-[140px]',
        skeleton: <Skeleton className="h-4 w-20 motion-safe:animate-pulse" />,
      },
      cell: ({ row }) => {
        const tags = row.original.tags;
        if (tags.length === 0) {
          return (
            <Text as="span" variant="caption">
              —
            </Text>
          );
        }
        const visible = tags.slice(0, 2);
        const overflow = tags.length - 2;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {visible.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="px-1.5 py-0.5 text-xs"
                style={
                  tag.colour
                    ? {
                        backgroundColor: tag.colour + '20',
                        color: tag.colour,
                        borderColor: tag.colour + '40',
                      }
                    : undefined
                }
              >
                {tag.name}
              </Badge>
            ))}
            {overflow > 0 && (
              <Text as="span" variant="caption">
                +{overflow}
              </Text>
            )}
          </div>
        );
      },
    },
    core.amount,
    // 9. Actions — chrome column, not a data column (no resize handle)
    {
      id: 'actions',
      enableSorting: false,
      enableResizing: false,
      enableHiding: false,
      header: '',
      size: 48,
      minSize: 48,
      maxSize: 48,
      meta: {
        headerClassName: 'w-12 max-w-12 px-1',
        cellClassName: 'w-12 max-w-12 px-1',
      },
      cell: ({ row }) => (
        <TransactionRowActionsDropdown
          actions={getTransactionRowActions(row.original, handlers)}
        />
      ),
    },
  ];
};
