import { useState } from "react"
import { Button } from "@ploutizo/ui/components/button"
import { AccountsTable } from "./AccountsTable"
import { AccountSheet } from "./AccountSheet"
import type { Account } from "@ploutizo/types"
import { useGetAccounts } from "@/lib/data-access/accounts"

export const Accounts = () => {
  const { data: accounts = [], isLoading } = useGetAccounts()
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
        <h1 className="font-heading text-xl font-semibold">
          Accounts
        </h1>
        <Button type="button" onClick={handleAddClick}>
          Add account
        </Button>
      </div>

      <AccountsTable
        accounts={accounts}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        onAddClick={handleAddClick}
      />

      <AccountSheet
        key={editingAccount?.id ?? "new"}
        open={sheetOpen}
        account={editingAccount}
        onClose={handleSheetClose}
      />
    </div>
  )
}
