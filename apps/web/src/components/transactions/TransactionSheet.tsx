import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ploutizo/ui/components/alert-dialog'
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
  const [isDirty, setIsDirty] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  const handleClose = () => {
    if (isDirty) {
      setDiscardOpen(true)
    } else {
      onClose()
    }
  }

  const handleDiscard = () => {
    setDiscardOpen(false)
    setIsDirty(false)
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) handleClose()
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

          {/* key resets form state when switching between transactions (D-09) */}
          <TransactionForm
            key={transaction?.id ?? 'new'}
            transaction={transaction}
            onClose={onClose}
            onDirtyChange={setIsDirty}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. They will be lost if you close without saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDiscard}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
