import type { TransactionRow } from '@ploutizo/validators';

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
  handlers: TransactionRowActionHandlers,
  writesBlocked = false
): TransactionRowAction[] => [
  {
    id: 'edit',
    label: writesBlocked ? 'Edit unavailable offline' : 'Edit',
    variant: 'default',
    disabled: writesBlocked || undefined,
    onSelect: () => {
      if (!writesBlocked) handlers.onEdit(transaction);
    },
  },
  {
    id: 'delete',
    label: writesBlocked ? 'Delete unavailable offline' : 'Delete',
    variant: 'destructive',
    disabled: writesBlocked || undefined,
    onSelect: () => {
      if (!writesBlocked) handlers.onDelete(transaction.id);
    },
  },
];
