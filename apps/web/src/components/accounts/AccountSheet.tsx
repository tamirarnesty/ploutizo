import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@ploutizo/ui/components/sheet';
import { AccountForm } from './AccountForm';
import type { Account } from '@ploutizo/types';
import { useArchiveAccount } from '@/lib/data-access/accounts';

interface AccountSheetProps {
  open: boolean;
  account: Account | null;
  onClose: () => void;
}

export const AccountSheet = ({ open, account, onClose }: AccountSheetProps) => {
  const isEditing = account !== null;
  const archiveAccount = useArchiveAccount();

  const handleArchive =
    isEditing && !account.archivedAt
      ? () => archiveAccount.mutate(account.id, { onSuccess: onClose })
      : undefined;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-[440px] flex-col p-0 sm:w-[440px]"
      >
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>{isEditing ? 'Edit account' : 'Add account'}</SheetTitle>
        </SheetHeader>

        <AccountForm
          account={account}
          onClose={onClose}
          onArchive={handleArchive}
        />
      </SheetContent>
    </Sheet>
  );
};
