export const TRANSACTION_TYPE_LABELS = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  settlement: 'Settlement',
  refund: 'Refund',
  contribution: 'Contribution',
} as const;

export const formatTransactionTypeLabel = (type: string): string =>
  TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] ?? type;
