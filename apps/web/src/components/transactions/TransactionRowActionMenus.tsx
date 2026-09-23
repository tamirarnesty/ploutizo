import { useMemo, useRef, useState } from 'react';
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
import type { ComponentType, ReactNode } from 'react';
import type {
  TransactionRowAction,
  TransactionRowActionHandlers,
} from './transactionRowActions';

type RowActionMenuItemProps = {
  variant?: TransactionRowAction['variant'];
  onClick?: () => void;
  children: ReactNode;
};

const TransactionRowActionMenuItems = ({
  actions,
  MenuItem,
}: {
  actions: readonly TransactionRowAction[];
  MenuItem: ComponentType<RowActionMenuItemProps>;
}) =>
  actions.map((action) => (
    <MenuItem
      key={action.id}
      variant={action.variant}
      onClick={action.onSelect}
    >
      {action.label}
    </MenuItem>
  ));

export const TransactionRowActionsDropdown = ({
  actions,
}: {
  actions: readonly TransactionRowAction[];
}) => (
  <div className="flex justify-center">
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
        <TransactionRowActionMenuItems
          actions={actions}
          MenuItem={DropdownMenuItem}
        />
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
  const transactionRef = useRef<TransactionRow | null>(null);
  const transactionsById = useMemo(
    () => new Map(transactions.map((entry) => [entry.id, entry])),
    [transactions]
  );
  const activeTransaction = transaction ?? transactionRef.current;
  const actions = activeTransaction
    ? getTransactionRowActions(activeTransaction, { onEdit, onDelete })
    : [];

  return (
    <ContextMenu
      onOpenChange={(open, eventDetails) => {
        if (!open) {
          transactionRef.current = null;
          setTransaction(null);
          return;
        }

        const next = resolveTransactionRowFromEventTarget(
          eventDetails.event.target,
          transactionsById
        );
        if (!next) {
          eventDetails.cancel();
          return;
        }

        transactionRef.current = next;
        setTransaction(next);
      }}
    >
      <ContextMenuTrigger
        // Kit trigger defaults to select-none; keep ordinary cell text selection.
        className="block w-full min-w-0 select-text"
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <TransactionRowActionMenuItems
          actions={actions}
          MenuItem={ContextMenuItem}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
};
