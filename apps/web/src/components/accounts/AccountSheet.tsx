import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@ploutizo/ui/components/sheet';
import type { AccountType } from '@ploutizo/types';
import type { Account } from '@ploutizo/validators';
import { useArchiveAccount } from '@/lib/data-access/accounts';
import { AccountForm } from './AccountForm';
import type { ReactNode } from 'react';

interface AccountSheetProps {
  open: boolean;
  account: Account | null;
  defaultType?: AccountType;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export const AccountSheet = ({
  open,
  account,
  defaultType,
  onOpenChange,
  children,
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
      {children}
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
