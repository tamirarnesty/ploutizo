import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AccountsTable } from '../components/accounts/accounts-table.js'
import { AccountSheet } from '../components/accounts/account-sheet.js'
import { useAccounts } from '../hooks/use-accounts.js'
import type { Account } from '@ploutizo/types'

export const Route = createFileRoute('/_layout/accounts')({
  component: AccountsPage,
})

function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const handleAddClick = () => {
    setEditingAccount(null)
    setSheetOpen(true)
  }
  const handleRowClick = (account: Account) => {
    setEditingAccount(account)
    setSheetOpen(true)
  }
  const handleSheetClose = () => {
    setSheetOpen(false)
    setEditingAccount(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold font-[--font-heading]">Accounts</h1>
        <button
          type="button"
          onClick={handleAddClick}
          className="h-9 px-4 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Add account
        </button>
      </div>

      <AccountsTable
        accounts={accounts}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        onAddClick={handleAddClick}
      />

      <AccountSheet
        open={sheetOpen}
        account={editingAccount}
        onClose={handleSheetClose}
      />
    </div>
  )
}
