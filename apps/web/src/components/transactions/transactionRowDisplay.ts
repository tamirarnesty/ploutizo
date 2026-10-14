import { formatCurrency } from '@ploutizo/utils/currency';
import { transactionAmountDisplay } from '@ploutizo/utils/transaction-list-amount';
import type { TransactionRow } from '@ploutizo/validators';

export const formatTransactionDate = (isoDate: string) =>
  new Date(isoDate + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatTransactionAccount = (
  row: Pick<TransactionRow, 'type' | 'accountName' | 'counterpartAccountName'>
) => {
  const { type, accountName, counterpartAccountName } = row;
  if (type === 'contribution') {
    return counterpartAccountName ?? accountName ?? '';
  }
  if (type === 'settlement') {
    return accountName ?? '';
  }
  if (counterpartAccountName) {
    return `${accountName} → ${counterpartAccountName}`;
  }
  return accountName ?? '';
};

export const formatSignedAmountCents = (amountCents: number) => {
  const formatted = formatCurrency(Math.abs(amountCents));
  if (amountCents < 0) {
    return {
      displayValue: `−${formatted}`,
      colorClass: 'text-destructive',
    };
  }
  if (amountCents > 0) {
    return {
      displayValue: `+${formatted}`,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  return {
    displayValue: formatCurrency(0),
    colorClass: 'text-muted-foreground',
  };
};

export const formatTransactionAmount = (
  row: Pick<TransactionRow, 'type' | 'amount'>
) => {
  const display = transactionAmountDisplay(row.type, row.amount);
  switch (display.kind) {
    case 'signed':
      return formatSignedAmountCents(display.signedCents);
    case 'unsigned':
      return {
        displayValue: formatCurrency(display.amountCents),
        colorClass: 'text-muted-foreground',
      };
    default: {
      const _exhaustive: never = display;
      return _exhaustive;
    }
  }
};

export const shouldShowTransactionCategory = (
  row: Pick<TransactionRow, 'categoryName' | 'type'>
) =>
  Boolean(
    row.categoryName && (row.type === 'expense' || row.type === 'refund')
  );
