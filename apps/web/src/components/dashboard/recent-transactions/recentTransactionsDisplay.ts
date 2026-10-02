import { formatCurrency } from '@ploutizo/utils/currency';
import { cn } from '@ploutizo/ui/lib/utils';
import type { TransactionRow } from '@ploutizo/validators';
import { colourTokenVar } from '@/components/colour/colour-token-style';

export const formatRecentTransactionDate = (isoDate: string) =>
  new Date(isoDate + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatRecentTransactionAccount = (row: TransactionRow) => {
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

export const formatRecentTransactionAmount = (row: TransactionRow) => {
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

export const recentTransactionCategoryDotStyle = (
  colour: TransactionRow['categoryColour']
) => (colour ? { backgroundColor: colourTokenVar(colour) } : undefined);

export const recentTransactionCategoryLabel = (row: TransactionRow) => {
  const { categoryName, type } = row;
  if (categoryName && (type === 'expense' || type === 'refund')) {
    return categoryName;
  }
  return null;
};

export const recentTransactionCategoryClassName = (hasCategory: boolean) =>
  cn('size-2 shrink-0 rounded-full', !hasCategory && 'bg-muted');
