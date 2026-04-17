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
import { Tooltip, TooltipContent, TooltipTrigger } from '@ploutizo/ui/components/tooltip'
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

export function buildColumns(
  setDeleteId: (id: string) => void,
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
        <Text as="span" variant="body-sm" className="text-muted-foreground">
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
          <Badge variant={variant}>{label}</Badge>
        ) : (
          <Badge className={className}>{label}</Badge>
        )
      },
    },
    // 3. Description
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
      cell: ({ row }) => (
        <div className="min-w-0">
          <Text as="span" variant="body-sm" className="min-w-0 truncate font-semibold">
            {row.original.description ?? row.original.merchant ?? '—'}
          </Text>
        </div>
      ),
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
        const { categoryName, categoryIcon, type } = row.original
        const showCategory =
          categoryName && (type === 'expense' || type === 'refund')
        return showCategory ? (
          <div className="flex items-center gap-1.5">
            <DynamicLucideIcon name={categoryIcon} size={16} />
            <Text as="span" variant="body-sm" className="min-w-0 truncate text-muted-foreground">{categoryName}</Text>
          </div>
        ) : (
          <Text as="span" variant="caption">—</Text>
        )
      },
    },
    // 5. Account
    {
      id: 'account',
      enableSorting: true,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Account" />,
      size: 160,
      meta: {
        headerClassName: 'min-w-[140px]',
        cellClassName: 'min-w-[140px]',
        skeleton: <Skeleton className="h-4 w-24 motion-safe:animate-pulse" />,
      },
      cell: ({ row }) => (
        <Text as="span" variant="body-sm" className="text-muted-foreground">
          {row.original.accountName ?? '—'}
        </Text>
      ),
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
    // 8. Amount
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
        const amountClass = ['expense', 'refund', 'settlement'].includes(row.original.type)
          ? 'text-destructive'
          : ['income', 'contribution'].includes(row.original.type)
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-muted-foreground' // transfer
        return (
          <Text as="span" variant="body-sm" className={`block text-right font-medium ${amountClass}`}>
            {formatCurrency(row.original.amount)}
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
                className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100 @media_(hover:_none):opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuItem
                    disabled
                    aria-disabled="true"
                    className="cursor-not-allowed opacity-50"
                  >
                    Edit
                  </DropdownMenuItem>
                }
              />
              <TooltipContent>Available in next update</TooltipContent>
            </Tooltip>
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
