import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { mockTransactionRow } from '@/test/overlayFixtures';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { buildColumns } from './TransactionColumns';
import {
  TransactionRowActionsDropdown,
  TransactionTableContextMenu,
} from './TransactionRowActionMenus';
import { getTransactionRowActions } from './transactionRowActions';
import type { CellContext } from '@tanstack/react-table';

const renderDescriptionCell = (
  transaction: TransactionRow,
  onOpenOriginal: (id: string) => void
) => {
  const columns = buildColumns(vi.fn(), vi.fn(), onOpenOriginal);
  const column = columns.find((entry) => entry.id === 'description');
  if (typeof column?.cell !== 'function') {
    throw new Error('Expected a description cell renderer');
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

const longPress = (target: HTMLElement) => {
  fireEvent.touchStart(target, {
    touches: [{ identifier: 1, clientX: 12, clientY: 24 }],
  });
};

const ContextMenuHarness = ({
  transaction,
  onEdit = vi.fn(),
  onDelete = vi.fn(),
}: {
  transaction: TransactionRow;
  onEdit?: (transaction: TransactionRow) => void;
  onDelete?: (id: string) => void;
}) => (
  <TransactionTableContextMenu
    transactions={[transaction]}
    onEdit={onEdit}
    onDelete={onDelete}
  >
    <table>
      <thead>
        <tr>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{transaction.description}</td>
          <td>
            <div data-transaction-id={transaction.id} />
          </td>
        </tr>
      </tbody>
    </table>
  </TransactionTableContextMenu>
);

describe('transaction row action parity', () => {
  it('opens the same Edit / Delete menu from a row context click', async () => {
    const user = userEvent.setup();
    const transaction = mockTransactionRow();
    const onEdit = vi.fn();

    render(<ContextMenuHarness transaction={transaction} onEdit={onEdit} />);

    const menu = await openContextMenuFrom(
      screen.getByText(transaction.description)
    );
    const items = within(menu).getAllByRole('menuitem');

    expect(items.map((item) => item.textContent)).toEqual(['Edit', 'Delete']);
    expect(items[1]).toHaveAttribute('data-variant', 'destructive');

    await user.click(within(menu).getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(transaction);
  });

  it('runs Delete from the shared context menu handler', async () => {
    const user = userEvent.setup();
    const transaction = mockTransactionRow();
    const onDelete = vi.fn();

    render(
      <ContextMenuHarness transaction={transaction} onDelete={onDelete} />
    );

    const menu = await openContextMenuFrom(
      screen.getByText(transaction.description)
    );
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith(transaction.id);
  });

  it('does not open the row menu from a header right-click', () => {
    render(<ContextMenuHarness transaction={mockTransactionRow()} />);

    fireEvent.contextMenu(screen.getByText('Date'));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the same Edit / Delete actions from a long press', async () => {
    vi.useFakeTimers();
    try {
      const transaction = mockTransactionRow();
      const onEdit = vi.fn();

      render(<ContextMenuHarness transaction={transaction} onEdit={onEdit} />);

      longPress(screen.getByText(transaction.description));
      await vi.advanceTimersByTimeAsync(500);

      const menu = screen.getByRole('menu');
      expect(
        within(menu)
          .getAllByRole('menuitem')
          .map((item) => item.textContent)
      ).toEqual(['Edit', 'Delete']);
      expect(
        within(menu).getByRole('menuitem', { name: 'Delete' })
      ).toHaveAttribute('data-variant', 'destructive');

      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Edit' }));
      expect(onEdit).toHaveBeenCalledWith(transaction);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not open the row menu from a header long press', async () => {
    vi.useFakeTimers();
    try {
      render(<ContextMenuHarness transaction={mockTransactionRow()} />);

      longPress(screen.getByText('Date'));
      await vi.advanceTimersByTimeAsync(500);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps end-of-row dropdown labels, order, handlers, and Delete color', async () => {
    const user = userEvent.setup();
    const transaction = mockTransactionRow();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const actions = getTransactionRowActions(transaction, {
      onEdit,
      onDelete,
    });

    render(
      <TransactionRowActionsDropdown
        transactionId={transaction.id}
        actions={actions}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Transaction actions' })
    );

    const menu = await screen.findByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Edit', 'Delete']);
    expect(items[1]).toHaveAttribute('data-variant', 'destructive');

    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(transaction.id);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('activates context menu items with the keyboard', async () => {
    const user = userEvent.setup();
    const transaction = mockTransactionRow();
    const onEdit = vi.fn();

    render(<ContextMenuHarness transaction={transaction} onEdit={onEdit} />);

    const menu = await openContextMenuFrom(
      screen.getByText(transaction.description)
    );
    within(menu).getByRole('menuitem', { name: 'Edit' }).focus();
    await user.keyboard('{Enter}');

    expect(onEdit).toHaveBeenCalledWith(transaction);
  });

  it('closes the context menu on Escape', async () => {
    const user = userEvent.setup();

    render(<ContextMenuHarness transaction={mockTransactionRow()} />);

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

    renderDescriptionCell(transaction, onOpenOriginal);

    await user.click(
      screen.getByRole('button', {
        name: /view original transaction/i,
      })
    );

    expect(onOpenOriginal).toHaveBeenCalledWith('tx-original');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
