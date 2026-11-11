import { useState } from 'react';
import type { TransactionRow } from '@ploutizo/validators';
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog';
import { AppSheet } from '@/components/overlays/AppSheet';
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
  const [isDirty, setIsDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // The form reports its dirtiness on mount and on change, so remounting it
  // for another transaction starts clean. Reset dirty/discard state when a
  // new editing session starts — adjusted during render to avoid an extra
  // commit.
  const sessionKey = `${open ? 'open' : 'closed'}:${transaction?.id ?? 'new'}`;
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey);
  if (prevSessionKey !== sessionKey) {
    setPrevSessionKey(sessionKey);
    setIsDirty(false);
    setDiscardOpen(false);
  }

  const handleClose = () => {
    if (isDirty) {
      setDiscardOpen(true);
    } else {
      onClose();
    }
  };

  const closeClean = () => {
    setIsDirty(false);
    onClose();
  };

  const handleDiscard = () => {
    setDiscardOpen(false);
    closeClean();
  };

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={(o) => {
          if (o) onSheetOpenChange(true);
          else handleClose();
        }}
        title={isEditing ? 'Edit transaction' : 'Add transaction'}
        description={
          isEditing
            ? 'Edit transaction details and save your changes.'
            : 'Record a new transaction.'
        }
        descriptionClassName="sr-only"
        headerClassName="border-b border-border px-6 py-4"
        /* 560px width per D-01: wider than AccountSheet (440px) to accommodate
            type-specific field groups + split section. Unchanged; not a product
            width change in this PR. */
        contentClassName="flex w-[560px] flex-col gap-0 sm:w-[560px]"
        side="right"
        trigger={trigger}
      >
        {/* Mount only while open so a closed sheet cannot keep a stale form (D-09). */}
        {open ? (
          <TransactionForm
            key={transaction?.id ?? 'new'}
            transaction={transaction}
            onClose={closeClean}
            onDirtyChange={setIsDirty}
          />
        ) : null}
      </AppSheet>

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
