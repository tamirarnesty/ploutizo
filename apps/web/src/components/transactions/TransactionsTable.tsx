import { useMemo, useState } from 'react'
import {
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import * as LucideIcons from 'lucide-react'
import { MoreHorizontal, Tag } from 'lucide-react'
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid'
import { DataGridColumnHeader } from '@ploutizo/ui/components/reui/data-grid/data-grid-column-header'
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table'
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area'
import { DataGridPagination } from '@ploutizo/ui/components/reui/data-grid/data-grid-pagination'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@ploutizo/ui/components/avatar'
import { Badge } from '@ploutizo/ui/components/badge'
import { Button } from '@ploutizo/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu'
import { Skeleton } from '@ploutizo/ui/components/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@ploutizo/ui/components/tooltip'
import { toast } from '@ploutizo/ui/components/sonner'
import { useDeleteTransaction, useRestoreTransaction } from '@/lib/data-access/transactions'
import type { TransactionRow } from '@/lib/data-access/transactions'
import { formatCurrency } from '@/lib/formatCurrency'
import type { TransactionSearch } from '../../routes/_layout.transactions'

// Resolves a Lucide icon by name — defined outside useMemo to be stable
const DynamicLucideIcon = ({ name, size = 16 }: { name: string | null; size?: number }) => {
  if (!name) return <Tag size={size} />
  const Icon = (LucideIcons as Record<string, unknown>)[name] as
    | React.ComponentType<{ size?: number }>
    | undefined
  return Icon ? <Icon size={size} /> : <Tag size={size} />
}

// Extracts up to 2 initials from a display name
const getInitials = (name: string | null): string =>
  name ? name.trim().slice(0, 2).toUpperCase() : '?'

// Per-type badge className map (per UI-SPEC.md)
const typeBadgeClassName: Record<string, string> = {
  expense: '',
  income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  transfer: '',
  settlement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  refund: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  contribution: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const typeBadgeVariant: Record<string, 'destructive' | 'secondary' | 'default' | 'outline' | undefined> = {
  expense: 'destructive',
  transfer: 'secondary',
}

interface TransactionsTableProps {
  transactions: Array<TransactionRow>
  total: number
  isLoading: boolean
  page: number
  limit: number
  sort: TransactionSearch['sort']
  order: TransactionSearch['order']
  onPageChange: (page: number) => void
  onSortChange: (col: TransactionSearch['sort'], dir: 'asc' | 'desc') => void
  onFilteredEmpty: boolean // true when filters active and no results
  onClearFilters: () => void
}

export const TransactionsTable = ({
  transactions,
  total,
  isLoading,
  page,
  limit,
  sort,
  order,
  onPageChange,
  onSortChange,
  onFilteredEmpty,
  onClearFilters,
}: TransactionsTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteMutation = useDeleteTransaction()
  const restoreMutation = useRestoreTransaction()

  const handleConfirmDelete = () => {
    if (!deleteId) return
    const id = deleteId
    setDeleteId(null) // Close dialog

    // Fire mutation — onMutate in the hook removes the row optimistically before API call
    deleteMutation.mutate(id)

    // Show Undo toast immediately (row is already gone optimistically)
    toast('Transaction deleted', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => restoreMutation.mutate(id),
      },
    })
  }

  const columns = useMemo<Array<ColumnDef<TransactionRow>>>(
    () => [
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
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.date + 'T00:00:00').toLocaleDateString('en-CA', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
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
            <span className="min-w-0 truncate text-sm font-semibold">
              {row.original.description ?? row.original.merchant ?? '\u2014'}
            </span>
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
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <DynamicLucideIcon name={categoryIcon} size={16} />
              <span className="min-w-0 truncate">{categoryName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{'\u2014'}</span>
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
          <span className="text-sm text-muted-foreground">
            {row.original.accountName ?? '\u2014'}
          </span>
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
            return <span className="text-muted-foreground">{'\u2014'}</span>
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
                <span className="text-xs text-muted-foreground">+{overflow}</span>
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
            <span className={`block text-right text-sm font-medium ${amountClass}`}>
              {formatCurrency(row.original.amount)}
            </span>
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
    ],
    []
  )

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // server-side pagination
    manualSorting: true, // server-side sort (RESEARCH Pitfall 8)
    rowCount: total, // TanStack Table server-side total for page math (RESEARCH Pitfall 3)
    state: {
      pagination: { pageIndex: page - 1, pageSize: limit },
      sorting: [{ id: sort, desc: order === 'desc' }],
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: page - 1, pageSize: limit })
          : updater
      onPageChange(next.pageIndex + 1)
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater([{ id: sort, desc: order === 'desc' }])
          : updater
      const col = next[0]
      if (!col) return
      onSortChange(col.id as TransactionSearch['sort'], col.desc ? 'desc' : 'asc')
    },
  })

  // Empty states (D-24, D-25) — rendered before DataGrid
  if (!isLoading && transactions.length === 0) {
    if (onFilteredEmpty) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
          <p className="text-sm font-medium">No transactions match your filters</p>
          <Button variant="link" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
        <p className="text-sm font-medium">No transactions yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Add your first transaction to start tracking your spending.
        </p>
        <Button
          type="button"
          disabled
          aria-disabled="true"
          title="Create transactions coming soon"
          className="mt-2"
        >
          Add transaction
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Delete confirm dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete transaction?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataGrid
        table={table}
        recordCount={total}
        isLoading={isLoading}
        emptyMessage="No transactions yet"
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
           * the two sections' visual order via order-1/order-2. These overrides
           * force a single-row layout at all sizes.
           */}
          <DataGridPagination className="flex-row [&>div:first-child]:order-1 [&>div:first-child]:pb-0 [&>div:last-child]:order-2 [&>div:last-child]:flex-row [&>div:last-child]:pt-0 [&_[role='combobox']]:w-16" />
        </div>
      </DataGrid>
    </>
  )
}
