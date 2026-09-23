import type { DataGridBodyRowProps } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import type { TransactionRow } from '@/lib/data-access/transactions';

export const TRANSACTION_ROW_ID_ATTR = 'data-transaction-id';

export const getTransactionRowBodyRowProps = (
  row: TransactionRow
): DataGridBodyRowProps => ({
  'data-transaction-id': row.id,
});

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

const getStampedTransactionBodyRow = (
  element: Element
): HTMLTableRowElement | null => {
  const stamped = element.closest(`tbody tr[${TRANSACTION_ROW_ID_ATTR}]`);
  if (stamped instanceof HTMLTableRowElement) return stamped;

  const row = element.closest('tbody tr');
  if (!(row instanceof HTMLTableRowElement)) return null;

  let sibling = row.previousElementSibling;
  while (sibling) {
    if (
      sibling instanceof HTMLTableRowElement &&
      sibling.hasAttribute(TRANSACTION_ROW_ID_ATTR)
    ) {
      return sibling;
    }
    sibling = sibling.previousElementSibling;
  }

  return null;
};

export const resolveTransactionRowFromEventTarget = (
  target: EventTarget | null,
  transactionsById: ReadonlyMap<string, TransactionRow>
): TransactionRow | null => {
  if (!(target instanceof Element)) return null;
  const row = getStampedTransactionBodyRow(target);
  if (!row) return null;
  const id = row.getAttribute(TRANSACTION_ROW_ID_ATTR);
  if (!id) return null;
  return transactionsById.get(id) ?? null;
};
