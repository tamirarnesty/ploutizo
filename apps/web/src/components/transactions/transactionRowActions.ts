import type { TransactionRow } from '@/lib/data-access/transactions';

export type TransactionRowActionId = 'edit' | 'delete';

export type TransactionRowActionVariant = 'default' | 'destructive';

export type TransactionRowActionHandlers = {
  onEdit: (transaction: TransactionRow) => void;
  onDelete: (id: string) => void;
};

export type TransactionRowAction = {
  id: TransactionRowActionId;
  label: string;
  variant: TransactionRowActionVariant;
  onSelect: () => void;
  disabled?: boolean;
};

export const getTransactionRowActions = (
  transaction: TransactionRow,
  handlers: TransactionRowActionHandlers
): TransactionRowAction[] => [
  {
    id: 'edit',
    label: 'Edit',
    variant: 'default',
    onSelect: () => handlers.onEdit(transaction),
  },
  {
    id: 'delete',
    label: 'Delete',
    variant: 'destructive',
    onSelect: () => handlers.onDelete(transaction.id),
  },
];
