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

  const closeSheet = () => onOpenChange(false);

  const handleArchive =
    isEditing && !account.archivedAt
      ? () => archiveAccount.mutate(account.id, { onSuccess: closeSheet })
      : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
          <SheetTitle>{isEditing ? 'Edit account' : 'Add account'}</SheetTitle>
          <SheetDescription className="sr-only">
            {isEditing
              ? 'Edit account details and save your changes.'
              : 'Create a new account for your household.'}
          </SheetDescription>
        </SheetHeader>

        <AccountForm
          account={account}
          defaultType={defaultType}
          onClose={closeSheet}
          onArchive={handleArchive}
        />
      </SheetContent>
    </Sheet>
  );
};
