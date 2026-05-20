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

/** Card-cell header: name, institution •••• last4, total balance + due. */
export const SettleDialogSummary = ({ account }: SettleDialogSummaryProps) => {
  const card = account.account;
  const institution = card.institution?.trim();
  const last = card.lastFour?.trim();

  const metaParts: string[] = [];
  if (institution) metaParts.push(institution);
  if (last) metaParts.push(`•••• ${last}`);
  const metaLine = metaParts.length > 0 ? metaParts.join(' ') : null;

  const totalLabel = formatCurrency(account.totalBalanceCents);
  const dueLabel = account.dueDate
    ? new Date(account.dueDate + 'T00:00:00').toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
      })
    : null;
  const balanceLine = `Total balance ${totalLabel}${dueLabel ? ` · Due ${dueLabel}` : ''}`;

  return (
    <DialogHeader>
      <DialogTitle>
        <Text
          as="span"
          variant="body-sm"
          className="block truncate text-sm leading-tight font-bold"
        >
          {card.name}
        </Text>
      </DialogTitle>
      <DialogDescription>
        <div className="flex flex-col gap-0.5">
          {metaLine !== null ? (
            <Text
              as="span"
              variant="body-sm"
              className="block truncate text-xs leading-tight text-muted-foreground"
            >
              {metaLine}
            </Text>
          ) : null}
          <Text as="span" variant="caption" className="text-muted-foreground">
            {balanceLine}
          </Text>
        </div>
      </DialogDescription>
    </DialogHeader>
  );
};
