import { formatCurrency } from '@ploutizo/utils/currency';
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

export const formatTransactionAmount = (
  row: Pick<TransactionRow, 'type' | 'amount'>
) => {
  const { type, amount } = row;
  const isExpense = type === 'expense';
  const isPositive = type === 'income' || type === 'refund';
  const formatted = formatCurrency(amount);
  const displayValue = isExpense
    ? `−${formatted}`
    : isPositive
      ? `+${formatted}`
      : formatted;
  const colorClass = isExpense
    ? 'text-destructive'
    : isPositive
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-muted-foreground';
  return { displayValue, colorClass };
};

export const shouldShowTransactionCategory = (
  row: Pick<TransactionRow, 'categoryName' | 'type'>
) =>
  Boolean(
    row.categoryName && (row.type === 'expense' || row.type === 'refund')
  );
