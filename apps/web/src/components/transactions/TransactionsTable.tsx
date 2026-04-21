import { useMemo, useState } from 'react'
import {
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid'
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table'
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area'
import { DataGridPagination } from '@ploutizo/ui/components/reui/data-grid/data-grid-pagination'
import { toast } from '@ploutizo/ui/components/sonner'
import { buildColumns } from './TransactionColumns'
import { DeleteTransactionDialog } from './DeleteTransactionDialog'
import { TransactionsTableEmpty } from './TransactionTableEmpty'
import { TransactionsTableEmptyFiltered } from './TransactionTableEmptyFiltered'
import type { TransactionRow } from '@/lib/data-access/transactions'
import type { TransactionSearch } from './transactionSearch'
import { useDeleteTransaction, useRestoreTransaction } from '@/lib/data-access/transactions'

interface TransactionsTableProps {
  transactions: TransactionRow[]
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
  onEdit: (transaction: TransactionRow) => void
  onOpenOriginal: (id: string) => void
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
  onEdit,
  onOpenOriginal,
}: TransactionsTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteMutation = useDeleteTransaction()
  const restoreMutation = useRestoreTransaction()

  const handleConfirmDelete = () => {
    if (!deleteId) return
    const id = deleteId
    // AlertDialogAction fires onClick BEFORE closing the dialog, so deleteId is still
    // valid here. The dialog closes via onOpenChange(false) after this returns.
    deleteMutation.mutate(id)
    toast('Transaction deleted', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => restoreMutation.mutate(id),
      },
    })
  }

  const columns = useMemo(
    () => buildColumns(setDeleteId, onEdit, onOpenOriginal),
    [setDeleteId, onEdit, onOpenOriginal],
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
      sorting: [{ id: sort ?? 'date', desc: order === 'desc' }],
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
          ? updater([{ id: sort ?? 'date', desc: order === 'desc' }])
          : updater
      const col = next[0]
      onSortChange(col.id as TransactionSearch['sort'], col.desc ? 'desc' : 'asc')
    },
  })

  // Empty states (D-24, D-25) — rendered before DataGrid
  if (!isLoading && transactions.length === 0) {
    if (onFilteredEmpty) {
      return <TransactionsTableEmptyFiltered onClearFilters={onClearFilters} />
    }
    return <TransactionsTableEmpty />
  }

  return (
    <>
      <DeleteTransactionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
      />

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
