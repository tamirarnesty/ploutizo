import { useMemo } from 'react';
import { Dialog, DialogContent } from '@ploutizo/ui/components/dialog';
import type { SettlementAccountRow } from '@ploutizo/types';
import { SettleDialogForm } from '@/components/dashboard/settle-dialog/SettleDialogForm';
import type { PayToward } from '@/components/dashboard/settleFormSchema';

export interface SettleDialogProps {
  open: boolean;
  account: SettlementAccountRow | null;
  onClose: () => void;
  initialPayToward?: PayToward | null;
}

export const SettleDialog = ({
  open,
  account,
  onClose,
  initialPayToward,
}: SettleDialogProps) => {
  const resolvedPayToward = useMemo((): PayToward | null => {
    if (!account) return null;
    if (initialPayToward) return initialPayToward;
    return account.members.at(0)?.member.id ?? 'shared';
  }, [account, initialPayToward]);

  if (!account || !resolvedPayToward) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <SettleDialogForm
          key={`${account.account.id}:${resolvedPayToward}`}
          account={account}
          initialPayToward={resolvedPayToward}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};
