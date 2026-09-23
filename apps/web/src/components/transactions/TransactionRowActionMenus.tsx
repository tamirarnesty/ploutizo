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
            // Touch has no hover, so the button stays visible. A mouse hides it until the row is hovered.
            className="pointer-fine:opacity-0 pointer-fine:focus-visible:opacity-100 pointer-fine:data-popup-open:opacity-100 pointer-fine:[tr:hover_&]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            variant={action.variant}
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

  const trackRow = (event: {
    target: EventTarget | null;
    stopPropagation: () => void;
  }) => {
    const next = resolveTransactionRowFromEventTarget(
      event.target,
      transactions
    );
    setTransaction(next);
    if (!next) event.stopPropagation();
    return next;
  };

  return (
    <ContextMenu
      onOpenChange={(open, eventDetails) => {
        if (!open) {
          setTransaction(null);
          return;
        }

        // Right-click and long-press both open here. Items always come from
        // getTransactionRowActions; this only picks which row they apply to.
        if (!trackRow(eventDetails.event)) eventDetails.cancel();
      }}
    >
      <ContextMenuTrigger
        // Kit trigger defaults to select-none; keep ordinary cell text selection.
        className="block w-full min-w-0 select-text"
        onContextMenuCapture={trackRow}
        onTouchStartCapture={trackRow}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {actions.map((action) => (
          <ContextMenuItem
            key={action.id}
            variant={action.variant}
            onClick={action.onSelect}
          >
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
};
