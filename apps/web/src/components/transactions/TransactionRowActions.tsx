import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@ploutizo/ui/components/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import type { TransactionRow } from '@/lib/data-access/transactions';
import {
  getTransactionRowActionItemClassName,
  getTransactionRowActions,
  resolveTransactionRowFromEventTarget,
} from './transactionRowActions';
import type { ReactNode } from 'react';
import type {
  TransactionRowAction,
  TransactionRowActionHandlers,
} from './transactionRowActions';

export const TransactionRowActionsDropdown = ({
  transactionId,
  actions,
}: {
  transactionId: string;
  actions: readonly TransactionRowAction[];
}) => (
  <div className="flex justify-center" data-transaction-id={transactionId}>
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Transaction actions"
            className="opacity-0 focus-visible:opacity-100 data-popup-open:opacity-100 [tr:hover_&]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            className={getTransactionRowActionItemClassName(action)}
            onClick={action.onSelect}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export const TransactionTableContextMenu = ({
  transactions,
  onEdit,
  onDelete,
  children,
}: TransactionRowActionHandlers & {
  transactions: readonly TransactionRow[];
  children: ReactNode;
}) => {
  const [transaction, setTransaction] = useState<TransactionRow | null>(null);
  const actions = transaction
    ? getTransactionRowActions(transaction, { onEdit, onDelete })
    : [];

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) setTransaction(null);
      }}
    >
      <ContextMenuTrigger
        // Kit trigger defaults to select-none; keep ordinary cell text selection.
        className="block w-full min-w-0 select-text"
        onContextMenuCapture={(event) => {
          const next = resolveTransactionRowFromEventTarget(
            event.target,
            transactions
          );
          setTransaction(next);
          if (!next) {
            event.stopPropagation();
          }
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {actions.map((action) => (
          <ContextMenuItem
            key={action.id}
            className={getTransactionRowActionItemClassName(action)}
            onClick={action.onSelect}
          >
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
};
