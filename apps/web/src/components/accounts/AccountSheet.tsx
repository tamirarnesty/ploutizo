import { useLayoutEffect, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@ploutizo/ui/components/sheet';
import type { AccountType } from '@ploutizo/types';
import type { Account } from '@ploutizo/validators';
import { useArchiveAccount } from '@/lib/data-access/accounts';
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog';
import { AccountForm } from './AccountForm';
import type { ReactElement, ReactNode } from 'react';

interface AccountSheetProps {
  open: boolean;
  account: Account | null;
  defaultType?: AccountType;
  onOpenChange: (open: boolean) => void;
  /**
   * Element rendered through `SheetTrigger` inside the sheet root, so it gets
   * trigger semantics (aria-haspopup, data-state, focus return) while page
   * content stays outside `Dialog.Root` — dialogs inside the root are marked
   * nested by Base UI and lose their backdrop overlay.
   */
  trigger?: ReactElement<{ children?: ReactNode }>;
}

export const AccountSheet = ({
  open,
  account,
  defaultType,
  onOpenChange,
  trigger,
}: AccountSheetProps) => {
  const isEditing = account !== null;
  const archiveAccount = useArchiveAccount();
  // The form reports its dirtiness on mount and on change, so remounting it
  // for another account starts clean.
  const isDirtyRef = useRef(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    isDirtyRef.current = false;
    setDiscardOpen(false);
  }, [open, account?.id]);

  const closeSheet = () => {
    isDirtyRef.current = false;
    onOpenChange(false);
  };

  const requestClose = () => {
    if (isDirtyRef.current) {
      setDiscardOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleDiscard = () => {
    setDiscardOpen(false);
    closeSheet();
  };

  const handleArchive =
    isEditing && !account.archivedAt
      ? () => archiveAccount.mutate(account.id, { onSuccess: closeSheet })
      : undefined;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (o) onOpenChange(true);
          else requestClose();
        }}
      >
        {/* Base UI takes children from the Trigger, not the render element —
            pass the element's children through or they are dropped. */}
        {trigger ? (
          <SheetTrigger render={trigger}>{trigger.props.children}</SheetTrigger>
        ) : null}
        <SheetContent
          side="right"
          className="flex w-[440px] flex-col gap-0 sm:w-[440px]"
        >
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>
              {isEditing ? 'Edit account' : 'Add account'}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {isEditing
                ? 'Edit account details and save your changes.'
                : 'Create a new account for your household.'}
            </SheetDescription>
          </SheetHeader>

          {/* Mount only while open so a closed sheet cannot keep a stale form (D-09). */}
          {open ? (
            <AccountForm
              key={account?.id ?? defaultType ?? 'new'}
              account={account}
              defaultType={defaultType}
              onClose={closeSheet}
              onArchive={handleArchive}
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
