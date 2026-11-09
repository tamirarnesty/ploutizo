import { useLayoutEffect, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@ploutizo/ui/components/sheet';
import type { TransactionRow } from '@ploutizo/validators';
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog';
import { TransactionForm } from './TransactionForm';
import type { ReactElement, ReactNode } from 'react';

interface TransactionSheetProps {
  open: boolean;
  transaction: TransactionRow | null; // null = create mode
  onSheetOpenChange: (open: boolean) => void;
  onClose: () => void;
  /**
   * Element rendered through `SheetTrigger` inside the sheet root, so it gets
   * trigger semantics (aria-haspopup, data-state, focus return) while page
   * content stays outside `Dialog.Root` — dialogs inside the root are marked
   * nested by Base UI and lose their backdrop overlay.
   */
  trigger?: ReactElement<{ children?: ReactNode }>;
}

export const TransactionSheet = ({
  open,
  transaction,
  onSheetOpenChange,
  onClose,
  trigger,
}: TransactionSheetProps) => {
  const isEditing = transaction !== null;
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
        {/* Base UI takes children from the Trigger, not the render element —
            pass the element's children through or they are dropped. */}
        {trigger ? (
          <SheetTrigger render={trigger}>{trigger.props.children}</SheetTrigger>
        ) : null}
        {/* 560px width per D-01: wider than AccountSheet (440px) to accommodate
            type-specific field groups + split section */}
        <SheetContent
          side="right"
          className="flex w-[560px] flex-col gap-0 sm:w-[560px]"
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

      <ConfirmDestructiveDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard changes?"
        description="You have unsaved changes. They will be lost if you close without saving."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        onConfirm={handleDiscard}
      />
    </>
  );
};
