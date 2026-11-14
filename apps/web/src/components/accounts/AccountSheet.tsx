import { useState } from 'react';
import type { AccountType } from '@ploutizo/types';
import type { Account } from '@ploutizo/validators';
import { AppSheet } from '@/components/overlays/AppSheet';
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
  const [isDirty, setIsDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // The form reports its dirtiness on mount and on change, so remounting it
  // for another account starts clean. Reset dirty/discard state when a new
  // editing session starts — adjusted during render to avoid an extra commit.
  const sessionKey = `${open ? 'open' : 'closed'}:${account?.id ?? defaultType ?? 'new'}`;
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey);
  if (prevSessionKey !== sessionKey) {
    setPrevSessionKey(sessionKey);
    setIsDirty(false);
    setDiscardOpen(false);
  }

  const closeSheet = () => {
    setIsDirty(false);
    onOpenChange(false);
  };

  const requestClose = () => {
    if (isDirty) {
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
      <AppSheet
        open={open}
        onOpenChange={(o) => {
          if (o) onOpenChange(true);
          else requestClose();
        }}
        title={isEditing ? 'Edit account' : 'Add account'}
        description={
          isEditing
            ? 'Edit account details and save your changes.'
            : 'Create a new account for your household.'
        }
        descriptionClassName="sr-only"
        headerClassName="border-b border-border px-6 py-4"
        contentClassName="flex w-[440px] flex-col gap-0 sm:w-[440px]"
        side="right"
        trigger={trigger}
      >
        {/* Mount only while open so a closed sheet cannot keep a stale form (D-09). */}
        {open ? (
          <AccountForm
            key={account?.id ?? defaultType ?? 'new'}
            account={account}
            defaultType={defaultType}
            onClose={closeSheet}
            onArchive={handleArchive}
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
