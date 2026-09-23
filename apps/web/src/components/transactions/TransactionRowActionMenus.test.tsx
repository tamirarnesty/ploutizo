import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { mockTransactionRow } from '@/test/overlayFixtures';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { buildColumns } from './TransactionColumns';
import { TransactionRowActionsDropdown } from './TransactionRowActionMenus';
import { getTransactionRowActions } from './transactionRowActions';
import {
  TRANSACTION_ROW_ACTION_LABELS,
  expectTransactionRowActionMenuLabels,
} from './transactionRowActionTestHelpers';
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

describe('transaction row action menus', () => {
  it('keeps end-of-row dropdown labels, order, handlers, and Delete color', async () => {
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
    expectTransactionRowActionMenuLabels(menu);
    const items = within(menu).getAllByRole('menuitem');
    expect(items[1]).toHaveAttribute('data-variant', 'destructive');

    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(transaction.id);
    expect(onEdit).not.toHaveBeenCalled();
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

  it('forwards disabled to menu items when set on an action', async () => {
    const user = userEvent.setup();
    const transaction = mockTransactionRow();
    const actions = getTransactionRowActions(transaction, {
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    }).map((action) =>
      action.id === 'delete' ? { ...action, disabled: true } : action
    );

    render(<TransactionRowActionsDropdown actions={actions} />);

    await user.click(
      screen.getByRole('button', { name: 'Transaction actions' })
    );

    const menu = await screen.findByRole('menu');
    expectTransactionRowActionMenuLabels(menu);
    expect(
      within(menu).getByRole('menuitem', {
        name: TRANSACTION_ROW_ACTION_LABELS[1],
      })
    ).toHaveAttribute('data-disabled');
  });
});
