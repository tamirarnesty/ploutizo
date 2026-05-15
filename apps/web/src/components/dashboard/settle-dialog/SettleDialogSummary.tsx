import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';
import { Text } from '@ploutizo/ui/components/text';
import type { SettlementAccountRow } from '@ploutizo/types';
import { formatCurrency } from '@/lib/formatCurrency';

type SettleDialogSummaryProps = {
  account: SettlementAccountRow;
};

export const SettleDialogSummary = ({ account }: SettleDialogSummaryProps) => {
  const totalLabel = formatCurrency(account.totalBalanceCents);
  const dueLabel = account.dueDate
    ? new Date(account.dueDate + 'T00:00:00').toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <DialogHeader>
      <DialogTitle>
        <Text as="span" variant="h3">{`Settle ${account.account.name}`}</Text>
      </DialogTitle>
      <DialogDescription>
        <Text
          as="span"
          variant="caption"
          className="text-muted-foreground"
        >{`Total balance: ${totalLabel}${dueLabel ? ` · Due ${dueLabel}` : ''}`}</Text>
      </DialogDescription>
    </DialogHeader>
  );
};
