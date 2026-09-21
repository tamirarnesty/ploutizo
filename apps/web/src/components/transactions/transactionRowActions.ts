import type { TransactionRow } from '@/lib/data-access/transactions';

export const TRANSACTION_ROW_ID_ATTR = 'data-transaction-id';

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

/** Matches the pre-PLO-108 ⋯ Delete classes. Kit `variant="destructive"` is washed out by popup `!text-accent-foreground`. */
export const getTransactionRowActionItemClassName = (
  action: Pick<TransactionRowAction, 'variant'>
) =>
  action.variant === 'destructive'
    ? 'text-destructive focus:text-destructive'
    : undefined;

export const resolveTransactionRowFromEventTarget = (
  target: EventTarget | null,
  transactions: readonly TransactionRow[]
): TransactionRow | null => {
  if (!(target instanceof Element)) return null;
  const row = target.closest('tbody tr');
  if (!row) return null;
  const id = row
    .querySelector(`[${TRANSACTION_ROW_ID_ATTR}]`)
    ?.getAttribute('data-transaction-id');
  if (!id) return null;
  return transactions.find((transaction) => transaction.id === id) ?? null;
};
