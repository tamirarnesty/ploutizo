import type { TransactionRow } from '@/lib/data-access/transactions';

export const TRANSACTION_ROW_ACTION_DEFS = [
  { id: 'edit', label: 'Edit', variant: 'default' },
  { id: 'delete', label: 'Delete', variant: 'destructive' },
] as const;

export type TransactionRowActionId =
  (typeof TRANSACTION_ROW_ACTION_DEFS)[number]['id'];

export type TransactionRowActionVariant =
  (typeof TRANSACTION_ROW_ACTION_DEFS)[number]['variant'];

export type TransactionRowActionHandlers = {
  onEdit: (transaction: TransactionRow) => void;
  onDelete: (id: string) => void;
};

export type TransactionRowAction = {
  id: TransactionRowActionId;
  label: string;
  variant: TransactionRowActionVariant;
  onSelect: () => void;
};

export const getTransactionRowActions = (
  transaction: TransactionRow,
  handlers: TransactionRowActionHandlers
): TransactionRowAction[] =>
  TRANSACTION_ROW_ACTION_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    variant: def.variant,
    onSelect:
      def.id === 'edit'
        ? () => handlers.onEdit(transaction)
        : () => handlers.onDelete(transaction.id),
  }));
