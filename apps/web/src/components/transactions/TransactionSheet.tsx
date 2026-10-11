import { useRef, useState } from 'react';
import { AlertDialog } from '@ploutizo/ui/components/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@ploutizo/ui/components/sheet';
import type { TransactionRow } from '@ploutizo/validators';
import { DestructiveAlertDialogContent } from '@/components/DestructiveAlertDialogContent';
import { TransactionForm } from './TransactionForm';

interface TransactionSheetProps {
  open: boolean;
  transaction: TransactionRow | null; // null = create mode
  onClose: () => void;
}

export const TransactionSheet = ({
  open,
  transaction,
  onClose,
}: TransactionSheetProps) => {
  const isEditing = transaction !== null;
  // The form reports its dirtiness on mount and on change, so remounting it
  // for another transaction starts clean.
  const isDirtyRef = useRef(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const handleClose = () => {
    if (isDirtyRef.current) {
      setDiscardOpen(true);
    } else {
      onClose();
    }
  };

  const closeClean = () => {
    isDirtyRef.current = false;
    onClose();
  };

  const handleDiscard = () => {
    setDiscardOpen(false);
    closeClean();
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) handleClose();
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
            onClose={closeClean}
            onDirtyChange={(dirty) => {
              isDirtyRef.current = dirty;
            }}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DestructiveAlertDialogContent
          title="Discard changes?"
          description="You have unsaved changes. They will be lost if you close without saving."
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          onConfirm={handleDiscard}
        />
      </AlertDialog>
    </>
  );
};
