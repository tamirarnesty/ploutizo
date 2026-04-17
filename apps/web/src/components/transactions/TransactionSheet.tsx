import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@ploutizo/ui/components/sheet'
import { TransactionForm } from './TransactionForm'
import type { TransactionRow } from '@/lib/data-access/transactions'

interface TransactionSheetProps {
  open: boolean
  transaction: TransactionRow | null  // null = create mode
  onClose: () => void
}

export const TransactionSheet = ({
  open,
  transaction,
  onClose,
}: TransactionSheetProps) => {
  const isEditing = transaction !== null

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      {/* 560px width per D-01: wider than AccountSheet (440px) to accommodate
          type-specific field groups + split section */}
      <SheetContent
        side="right"
        className="flex w-[560px] flex-col p-0 sm:w-[560px]"
      >
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>
            {isEditing ? 'Edit transaction' : 'Add transaction'}
          </SheetTitle>
        </SheetHeader>

        <TransactionForm
          transaction={transaction}
          onClose={onClose}
        />
      </SheetContent>
    </Sheet>
  )
}
