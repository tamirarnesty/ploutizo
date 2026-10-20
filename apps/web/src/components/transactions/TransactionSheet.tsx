import { useLayoutEffect, useRef, useState } from 'react';
import { AlertDialog } from '@ploutizo/ui/components/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@ploutizo/ui/components/sheet';
import { useIsMobile } from '@ploutizo/ui/hooks/use-mobile';
import { cn } from '@ploutizo/ui/lib/utils';
import type { TransactionRow } from '@ploutizo/validators';
import { DestructiveAlertDialogContent } from '@/components/DestructiveAlertDialogContent';
import { TransactionForm } from './TransactionForm';
import type { ReactNode } from 'react';

interface TransactionSheetProps {
  open: boolean;
  transaction: TransactionRow | null; // null = create mode
  onSheetOpenChange: (open: boolean) => void;
  onClose: () => void;
  children: ReactNode;
}

export const TransactionSheet = ({
  open,
  transaction,
  onSheetOpenChange,
  onClose,
  children,
}: TransactionSheetProps) => {
  const isEditing = transaction !== null;
  const isMobile = useIsMobile();
  // The form reports its dirtiness on mount and on change, so remounting it
  // for another transaction starts clean.
  const isDirtyRef = useRef(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    isDirtyRef.current = false;
    setDiscardOpen(false);
  }, [open, transaction?.id]);

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
          if (o) onSheetOpenChange(true);
          else handleClose();
        }}
      >
        {children}
        {/* 560px width per D-01: wider than AccountSheet (440px) to accommodate
            type-specific field groups + split section */}
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={cn(
            'flex flex-col gap-0',
            isMobile
              ? 'h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none border-t'
              : 'w-[560px] sm:w-[560px]'
          )}
        >
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>
              {isEditing ? 'Edit transaction' : 'Add transaction'}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {isEditing
                ? 'Edit transaction details and save your changes.'
                : 'Record a new transaction.'}
            </SheetDescription>
          </SheetHeader>

          {/* Mount only while open so a closed sheet cannot keep a stale form (D-09). */}
          {open ? (
            <TransactionForm
              key={transaction?.id ?? 'new'}
              transaction={transaction}
              onClose={closeClean}
              onDirtyChange={(dirty) => {
                isDirtyRef.current = dirty;
              }}
            />
          ) : null}
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
