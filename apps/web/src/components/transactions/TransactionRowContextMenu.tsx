import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@ploutizo/ui/components/context-menu';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { TransactionRowActionItems } from './TransactionRowActionItems';
import { getTransactionRowActions } from './transactionRowActions';
import type { TransactionRowActionHandlers } from './transactionRowActions';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export const TRANSACTION_ROW_ID_ATTR = 'data-transaction-id';

type TransactionRowContextMenuProps = {
  transaction: TransactionRow;
  handlers: TransactionRowActionHandlers;
  children: ReactNode;
};

export const TransactionRowContextMenu = ({
  transaction,
  handlers,
  children,
}: TransactionRowContextMenuProps) => {
  const actions = getTransactionRowActions(transaction, handlers);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        // Kit trigger defaults to select-none; keep ordinary cell text selection.
        className="block w-full min-w-0 select-text"
        data-transaction-id={transaction.id}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <TransactionRowActionItems actions={actions} Item={ContextMenuItem} />
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const applyTransactionRowContextMenu = (
  columns: ColumnDef<TransactionRow>[],
  handlers: TransactionRowActionHandlers
): ColumnDef<TransactionRow>[] =>
  columns.map((column) => {
    const { cell } = column;
    if (typeof cell !== 'function') {
      return column;
    }

    return {
      ...column,
      cell: (context) => (
        <TransactionRowContextMenu
          transaction={context.row.original}
          handlers={handlers}
        >
          {cell(context)}
        </TransactionRowContextMenu>
      ),
    };
  });
