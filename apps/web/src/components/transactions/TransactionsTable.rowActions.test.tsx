import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { mockTransactionRow } from '@/test/overlayFixtures';
import { TransactionsTable } from './TransactionsTable';

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
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual(['Edit', 'Delete']);

    await user.click(within(menu).getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(transaction);
  });

  it('keeps the end-of-row actions button and opens the same items', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(
      screen.getByRole('button', { name: 'Transaction actions' })
    );

    const menu = await screen.findByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual(['Edit', 'Delete']);
  });
});
