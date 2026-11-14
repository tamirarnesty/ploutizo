import { useMemo } from 'react';
import type { SettlementAccountRow } from '@ploutizo/validators';
import { AppDialog } from '@/components/overlays/AppDialog';
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
    return (
      [...account.members]
        .sort((a, b) => a.member.id.localeCompare(b.member.id))
        .at(0)?.member.id ?? 'shared'
    );
  }, [account, initialPayToward]);

  if (!open && !account) return null;

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={account?.account.name ?? 'Settle balance'}
      titleClassName="sr-only"
    >
      {account && resolvedPayToward ? (
        <SettleDialogForm
          key={`${account.account.id}:${resolvedPayToward}`}
          account={account}
          initialPayToward={resolvedPayToward}
          onClose={onClose}
        />
      ) : null}
    </AppDialog>
  );
};
