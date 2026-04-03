import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import type { Account } from '@ploutizo/types'
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid'
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table'
import { Badge } from '@ploutizo/ui/components/badge'
import { Button } from '@ploutizo/ui/components/button'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  chequing: 'Chequing',
  savings: 'Savings',
  credit_card: 'Credit Card',
  prepaid_cash: 'Prepaid / Cash',
  e_transfer: 'e-Transfer',
  investment: 'Investment',
  other: 'Other',
}

interface AccountsTableProps {
  accounts: Account[]
  isLoading: boolean
  onRowClick: (account: Account) => void
  onAddClick: () => void
}

export function AccountsTable({ accounts, isLoading, onRowClick, onAddClick }: AccountsTableProps) {
  const columns = useMemo<ColumnDef<Account>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="text-sm font-semibold">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {ACCOUNT_TYPE_LABELS[row.original.type] ?? row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'institution',
      header: 'Institution',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.institution ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'lastFour',
      header: 'Last 4',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-muted-foreground">
          {row.original.lastFour ?? '—'}
        </span>
      ),
    },
    {
      id: 'owners',
      header: 'Owners',
      cell: () => <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'archivedAt',
      header: 'Status',
      cell: ({ row }) =>
        row.original.archivedAt ? (
          <Badge variant="secondary">Archived</Badge>
        ) : (
          <Badge variant="outline" className="text-green-700 border-green-300">
            Active
          </Badge>
        ),
    },
  ], [])

  const table = useReactTable({
    data: accounts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (!isLoading && accounts.length === 0) {
    return (
      <div className="rounded-lg border border-border py-16 flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium">No accounts yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Add your first account to start tracking transactions.
        </p>
        <Button type="button" onClick={onAddClick} className="mt-2">
          Add account
        </Button>
      </div>
    )
  }

  return (
    <DataGridContainer>
      <DataGrid
        table={table}
        recordCount={accounts.length}
        isLoading={isLoading}
        onRowClick={onRowClick}
        emptyMessage="No accounts yet"
      >
        <DataGridTable />
      </DataGrid>
    </DataGridContainer>
  )
}
