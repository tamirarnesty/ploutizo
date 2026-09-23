import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { mockTransactionRow } from '@/test/overlayFixtures';
import { TransactionsTable } from './TransactionsTable';
import { expectTransactionRowActionMenuLabels } from './transactionRowActionTestHelpers';

vi.mock('@/lib/data-access/transactions/useDeleteTransaction', () => ({
  useDeleteTransaction: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/data-access/transactions/useRestoreTransaction', () => ({
  useRestoreTransaction: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/components/categories/usePreloadLucideIcons', () => ({
  usePreloadLucideIcons: () => undefined,
}));

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const renderTable = (
  overrides: Partial<Parameters<typeof TransactionsTable>[0]> = {}
) => {
  const transaction = mockTransactionRow();
  const onEdit = vi.fn();

  render(
    <TooltipProvider delay={0}>
      <TransactionsTable
        transactions={[transaction]}
        total={1}
        isLoading={false}
        page={1}
        limit={25}
        sort="date"
        order="desc"
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        onSortChange={vi.fn()}
        onFilteredEmpty={false}
        onClearFilters={vi.fn()}
        onEdit={onEdit}
        onOpenOriginal={vi.fn()}
        {...overrides}
      />
    </TooltipProvider>
  );

  return { transaction, onEdit };
};

describe('TransactionsTable row context menu', () => {
  it('opens Edit / Delete from a right-click on row content', async () => {
    const { transaction, onEdit } = renderTable();
    const user = userEvent.setup();

    fireEvent.contextMenu(screen.getByText(transaction.description));

    const menu = await screen.findByRole('menu');
    expectTransactionRowActionMenuLabels(menu);

    expect(
      within(menu).getByRole('menuitem', { name: 'Delete' })
    ).toHaveAttribute('data-variant', 'destructive');

    await user.click(within(menu).getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(transaction);
  });

  it('opens the same menu from a long press on row content', async () => {
    vi.useFakeTimers();
    try {
      const { transaction, onEdit } = renderTable();

      fireEvent.touchStart(screen.getByText(transaction.description), {
        touches: [{ identifier: 1, clientX: 12, clientY: 24 }],
      });
      await vi.advanceTimersByTimeAsync(500);

      const menu = screen.getByRole('menu');
      expectTransactionRowActionMenuLabels(menu);

      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Edit' }));
      expect(onEdit).toHaveBeenCalledWith(transaction);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the same menu from a right-click on another cell in the row', async () => {
    renderTable();

    fireEvent.contextMenu(screen.getByText(/jun/i));

    const menu = await screen.findByRole('menu');
    expectTransactionRowActionMenuLabels(menu);
  });

  it('opens the row menu from a right-click on the actions column', async () => {
    renderTable();

    fireEvent.contextMenu(
      screen.getByRole('button', { name: 'Transaction actions' })
    );

    const menu = await screen.findByRole('menu');
    expectTransactionRowActionMenuLabels(menu);
  });

  it('does not open the row menu from a header right-click', () => {
    renderTable();

    fireEvent.contextMenu(screen.getByText('Date'));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('activates context menu items with the keyboard', async () => {
    const user = userEvent.setup();
    const { transaction, onEdit } = renderTable();

    fireEvent.contextMenu(screen.getByText(transaction.description));

    const menu = await screen.findByRole('menu');
    within(menu).getByRole('menuitem', { name: 'Edit' }).focus();
    await user.keyboard('{Enter}');

    expect(onEdit).toHaveBeenCalledWith(transaction);
  });

  it('closes the context menu on Escape', async () => {
    const user = userEvent.setup();
    const { transaction } = renderTable();

    const menu = await (async () => {
      fireEvent.contextMenu(screen.getByText(transaction.description));
      return screen.findByRole('menu');
    })();

    await user.keyboard('{Escape}');

    expect(menu).toHaveAttribute('data-closed');
  });

  it('keeps the end-of-row actions button and opens the same items', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(
      screen.getByRole('button', { name: 'Transaction actions' })
    );

    const menu = await screen.findByRole('menu');
    expectTransactionRowActionMenuLabels(menu);
  });
});
