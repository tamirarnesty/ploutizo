import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { mockTransactionRow } from '@/test/overlayFixtures';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { buildColumns } from './TransactionColumns';
import { TransactionRowActionsDropdown } from './TransactionRowActionsDropdown';
import {
  TRANSACTION_ROW_ID_ATTR,
  TransactionRowContextMenu,
} from './TransactionRowContextMenu';
import { getTransactionRowActions } from './transactionRowActions';
import type { CellContext } from '@tanstack/react-table';

const renderCell = (
  columnId: string,
  transaction: TransactionRow,
  handlers: {
    onEdit: (transaction: TransactionRow) => void;
    onDelete: (id: string) => void;
    onOpenOriginal: (id: string) => void;
  }
) => {
  const columns = buildColumns(
    handlers.onDelete,
    handlers.onEdit,
    handlers.onOpenOriginal
  );
  const column = columns.find((entry) => entry.id === columnId);
  if (typeof column?.cell !== 'function') {
    throw new Error(`Expected a cell renderer for ${columnId}`);
  }

  const context = {
    row: { original: transaction },
  } as CellContext<TransactionRow, unknown>;

  return render(
    <TooltipProvider delay={0}>{column.cell(context)}</TooltipProvider>
  );
};

const openContextMenuFrom = async (target: HTMLElement) => {
  fireEvent.contextMenu(target);
  return screen.findByRole('menu');
};

describe('transaction row action parity', () => {
  it('opens the same Edit / Delete menu from a row context click', async () => {
    const user = userEvent.setup();
    const transaction = mockTransactionRow();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <TransactionRowContextMenu
        transaction={transaction}
        handlers={{ onEdit, onDelete }}
      >
        <span>Coffee</span>
      </TransactionRowContextMenu>
    );

    const menu = await openContextMenuFrom(screen.getByText('Coffee'));
    const items = within(menu).getAllByRole('menuitem');

    expect(items.map((item) => item.textContent)).toEqual(['Edit', 'Delete']);

    await user.click(within(menu).getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(transaction);
  });

  it('runs Delete from the shared context menu handler', async () => {
    const user = userEvent.setup();
    const transaction = mockTransactionRow();
    const onDelete = vi.fn();

    render(
      <TransactionRowContextMenu
        transaction={transaction}
        handlers={{ onEdit: vi.fn(), onDelete }}
      >
        <span>Coffee</span>
      </TransactionRowContextMenu>
    );

    const menu = await openContextMenuFrom(screen.getByText('Coffee'));
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith(transaction.id);
  });

  it('keeps end-of-row dropdown labels, order, and handlers', async () => {
    const user = userEvent.setup();
    const transaction = mockTransactionRow();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const actions = getTransactionRowActions(transaction, {
      onEdit,
      onDelete,
    });

    render(<TransactionRowActionsDropdown actions={actions} />);

    await user.click(
      screen.getByRole('button', { name: 'Transaction actions' })
    );

    const menu = await screen.findByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Edit', 'Delete']);

    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(transaction.id);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('activates context menu items with the keyboard', async () => {
    const user = userEvent.setup();
    const transaction = mockTransactionRow();
    const onEdit = vi.fn();

    render(
      <TransactionRowContextMenu
        transaction={transaction}
        handlers={{ onEdit, onDelete: vi.fn() }}
      >
        <span>Coffee</span>
      </TransactionRowContextMenu>
    );

    const menu = await openContextMenuFrom(screen.getByText('Coffee'));
    const editItem = within(menu).getByRole('menuitem', { name: 'Edit' });
    editItem.focus();
    await user.keyboard('{Enter}');

    expect(onEdit).toHaveBeenCalledWith(transaction);
  });

  it('closes the context menu on Escape', async () => {
    const user = userEvent.setup();

    render(
      <TransactionRowContextMenu
        transaction={mockTransactionRow()}
        handlers={{ onEdit: vi.fn(), onDelete: vi.fn() }}
      >
        <span>Coffee</span>
      </TransactionRowContextMenu>
    );

    const menu = await openContextMenuFrom(screen.getByText('Coffee'));
    await user.keyboard('{Escape}');

    expect(menu).toHaveAttribute('data-closed');
  });

  it('does not swallow left-click on nested refund controls', async () => {
    const user = userEvent.setup();
    const onOpenOriginal = vi.fn();
    const transaction = {
      ...mockTransactionRow(),
      type: 'refund' as const,
      refundOfId: 'tx-original',
      refundOfDate: '2026-04-03',
      refundOfAmountCents: 1200,
    };

    renderCell('description', transaction, {
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onOpenOriginal,
    });

    await user.click(
      screen.getByRole('button', {
        name: /view original transaction/i,
      })
    );

    expect(onOpenOriginal).toHaveBeenCalledWith('tx-original');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('wraps every data cell so right-click outside the ⋯ still opens the row menu', async () => {
    const transaction = mockTransactionRow();
    const onEdit = vi.fn();

    renderCell('date', transaction, {
      onEdit,
      onDelete: vi.fn(),
      onOpenOriginal: vi.fn(),
    });

    const trigger = document.querySelector(
      `[${TRANSACTION_ROW_ID_ATTR}="${transaction.id}"]`
    );
    expect(trigger).toBeTruthy();

    const menu = await openContextMenuFrom(trigger as HTMLElement);
    expect(
      within(menu).getByRole('menuitem', { name: 'Edit' })
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Delete' })
    ).toBeInTheDocument();
  });
});
