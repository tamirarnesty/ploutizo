import { MoreHorizontal, Tag } from 'lucide-react'
import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@ploutizo/ui/components/avatar'
import { Badge } from '@ploutizo/ui/components/badge'
import { Button } from '@ploutizo/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu'
import { Skeleton } from '@ploutizo/ui/components/skeleton'
import { Text } from '@ploutizo/ui/components/text'
import { cn } from '@ploutizo/ui/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import type { TransactionRow } from '@/lib/data-access/transactions'
import { ICON_MAP } from '@/components/categories/LucideIconPicker'
import { formatCurrency } from '@/lib/formatCurrency'

// Resolves a Lucide icon by name — defined outside useMemo to be stable
export const DynamicLucideIcon = ({ name, size = 16 }: { name: string | null; size?: number }) => {
  if (!name) return <Tag size={size} />
  const Icon = ICON_MAP[name]
  return Icon ? <Icon size={size} aria-hidden="true" /> : <Tag size={size} />
}

// Extracts up to 2 initials from a display name
export const getInitials = (name: string | null): string =>
  name ? name.trim().slice(0, 2).toUpperCase() : '?'

// Per-type badge className map (per UI-SPEC.md)
export const typeBadgeClassName: Record<string, string> = {
  expense: '',
  income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  transfer: '',
  settlement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  refund: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  contribution: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export const typeBadgeVariant: Record<string, 'destructive' | 'secondary' | 'default' | 'outline' | undefined> = {
  expense: 'destructive',
  transfer: 'secondary',
}

// Internal transaction types rendered at reduced opacity in type badges
const isInternalType = (t: string) =>
  ['transfer', 'settlement', 'contribution'].includes(t)

export function buildColumns(
  setDeleteId: (id: string) => void,
  onEdit: (transaction: TransactionRow) => void,
  onOpenOriginal: (id: string) => void,
): ColumnDef<TransactionRow>[] {
  return [
    // 1. Date
    {
      id: 'date',
      accessorKey: 'date',
      enableSorting: true,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
      size: 120,
      meta: {
        headerClassName: 'min-w-[100px]',
        cellClassName: 'min-w-[100px]',
        skeleton: <Skeleton className="h-4 w-20 motion-safe:animate-pulse" />,
      },
      cell: ({ row }) => (
        <Text as="span" variant="body-sm" className="whitespace-nowrap text-muted-foreground">
          {new Date(row.original.date + 'T00:00:00').toLocaleDateString('en-CA', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      ),
    },
    // 2. Type
    {
      id: 'type',
      accessorKey: 'type',
      enableSorting: true,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
      size: 140,
      meta: {
        headerClassName: 'min-w-[120px]',
        cellClassName: 'min-w-[120px]',
        skeleton: <Skeleton className="h-5 w-16 rounded-full motion-safe:animate-pulse" />,
      },
      cell: ({ row }) => {
        const type = row.original.type
        const variant = typeBadgeVariant[type]
        const className = typeBadgeClassName[type]
        const label = type.charAt(0).toUpperCase() + type.slice(1)
        return variant ? (
          <Badge
            variant={variant}
            className={cn(isInternalType(type) && 'opacity-60')}
          >
            {label}
          </Badge>
        ) : (
          <Badge className={cn(className, isInternalType(type) && 'opacity-60')}>
            {label}
          </Badge>
        )
      },
    },
    // 3. Description — includes refund sub-line (D-24) for refund rows with a linked original
    {
      id: 'description',
      enableSorting: false,
      header: 'Description',
      size: 9999,
      meta: {
        headerClassName: 'min-w-[200px]',
        cellClassName: 'min-w-[200px]',
        skeleton: <Skeleton className="h-4 w-40 motion-safe:animate-pulse" />,
      },
      cell: ({ row }) => {
        const { description, type, refundOfId, refundOfDate, refundOfAmountCents } = row.original
        const hasRefundLink = type === 'refund' && refundOfId !== null

        // Format refund original date as "MMM D, YYYY" (e.g. "Apr 3, 2025")
        const formattedRefundDate = hasRefundLink && refundOfDate
          ? new Date(refundOfDate + 'T00:00:00').toLocaleDateString('en-CA', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : null

        return (
          <div className="min-w-0">
            <Text as="span" variant="body-sm" className="min-w-0 truncate font-semibold">
              {description}
            </Text>
            {hasRefundLink ? (
              <button
                type="button"
                className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => onOpenOriginal(refundOfId)}
                aria-label={`View original transaction from ${formattedRefundDate}`}
              >
                {/* ↩ U+21A9 LEFTWARDS ARROW WITH HOOK */}
                <span aria-hidden="true">↩</span>
                {/* · U+00B7 MIDDLE DOT */}
                <span>{formattedRefundDate} · {formatCurrency(refundOfAmountCents ?? 0)}</span>
              </button>
            ) : null}
          </div>
        )
      },
    },
    // 4. Category
    {
      id: 'category',
      enableSorting: true,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
      size: 160,
      meta: {
        headerClassName: 'min-w-[140px]',
        cellClassName: 'min-w-[140px]',
        skeleton: <Skeleton className="h-4 w-24 motion-safe:animate-pulse" />,
      },
      cell: ({ row }) => {
        const { categoryName, categoryIcon, categoryColour, type } = row.original
        const showCategory =
          categoryName && (type === 'expense' || type === 'refund')
        return showCategory ? (
          <Badge
            variant="outline"
            className="gap-1 px-1.5 py-0.5 text-xs font-normal"
            style={
              categoryColour
                ? {
                    backgroundColor: `oklch(from var(--color-${categoryColour}) l c h / 0.12)`,
                    color: `var(--color-${categoryColour})`,
                    borderColor: `oklch(from var(--color-${categoryColour}) l c h / 0.25)`,
                  }
                : undefined
            }
          >
            <DynamicLucideIcon name={categoryIcon} size={12} />
            <span className="min-w-0 truncate">{categoryName}</span>
          </Badge>
        ) : (
          <Text as="span" variant="caption">—</Text>
        )
      },
    },
    // 5. Account — shows "A → B" (U+2192) when counterpart present (D-23)
    {
      id: 'account',
      enableSorting: true,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Account" />,
      size: 220,
      meta: {
        headerClassName: 'min-w-[180px]',
        cellClassName: 'min-w-[180px]',
        skeleton: <Skeleton className="h-4 w-24 motion-safe:animate-pulse" />,
      },
      cell: ({ row }) => {
        const { accountName, counterpartAccountName } = row.original
        // → U+2192 RIGHTWARDS ARROW
        const displayText = counterpartAccountName
          ? `${accountName} \u2192 ${counterpartAccountName}`
          : accountName ?? ''
        return (
          <div className="min-w-0">
            <Text variant="body-sm" className="truncate min-w-0 text-muted-foreground">
              {displayText}
            </Text>
          </div>
        )
      },
    },
    // 6. Assignees
    {
      id: 'assignees',
      enableSorting: false,
      header: 'Assignees',
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
      cell: ({ row }) => {
        const assignees = row.original.assignees
        if (assignees.length === 0) return null
        const visible = assignees.slice(0, 3)
        const overflow = assignees.length - 3
        return (
          <AvatarGroup>
            {visible.map((a) => (
              <Avatar key={a.memberId} size="sm" aria-label={a.memberName ?? ''}>
                <AvatarFallback>{getInitials(a.memberName)}</AvatarFallback>
              </Avatar>
            ))}
            {overflow > 0 && (
              <AvatarGroupCount aria-label={`and ${overflow} more`}>
                +{overflow}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
        )
      },
    },
    // 7. Tags
    {
      id: 'tags',
      enableSorting: false,
      header: 'Tags',
      size: 160,
      meta: {
        headerClassName: 'min-w-[140px]',
        cellClassName: 'min-w-[140px]',
        skeleton: <Skeleton className="h-4 w-20 motion-safe:animate-pulse" />,
      },
      cell: ({ row }) => {
        const tags = row.original.tags
        if (tags.length === 0) {
          return <Text as="span" variant="caption">—</Text>
        }
        const visible = tags.slice(0, 2)
        const overflow = tags.length - 2
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
              <Text as="span" variant="caption">+{overflow}</Text>
            )}
          </div>
        )
      },
    },
    // 8. Amount — signed and color-coded per type (D-22)
    {
      id: 'amount',
      accessorKey: 'amount',
      enableSorting: true,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Amount" />,
      size: 120,
      meta: {
        headerClassName: 'min-w-[100px]',
        cellClassName: 'min-w-[100px]',
        skeleton: <Skeleton className="ml-auto h-4 w-16 motion-safe:animate-pulse" />,
      },
      cell: ({ row }) => {
        const { type, amount } = row.original
        const isExpense = type === 'expense'
        const isPositive = type === 'income' || type === 'refund'

        const formatted = formatCurrency(amount)
        // U+2212 MINUS SIGN for expense (not hyphen-minus)
        const displayValue = isExpense
          ? `\u2212${formatted}`
          : isPositive
            ? `+${formatted}`
            : formatted

        const colorClass = isExpense
          ? 'text-destructive'
          : isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-muted-foreground'

        return (
          <Text variant="body-sm" className={cn('block whitespace-nowrap text-right font-medium', colorClass)}>
            {displayValue}
          </Text>
        )
      },
    },
    // 9. Actions
    {
      id: 'actions',
      enableSorting: false,
      header: '',
      size: 48,
      meta: {
        headerClassName: 'w-12',
        cellClassName: 'w-12',
      },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Transaction actions"
                className="opacity-0 [tr:hover_&]:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
