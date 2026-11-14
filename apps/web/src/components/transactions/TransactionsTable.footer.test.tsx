import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import {
  ensureTransactionColumnLayoutHydrated,
  useTransactionColumnLayoutStore,
} from '@/lib/prefs/transactionColumnLayoutStore';
import { mockTransactionRow } from '@/test/overlayFixtures';
import { TransactionsTable } from './TransactionsTable';
import type { ComponentProps } from 'react';

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
  props: Partial<ComponentProps<typeof TransactionsTable>>
) =>
  render(
    <TooltipProvider delay={0}>
      <TransactionsTable
        transactions={[]}
        total={0}
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
        onAddTransaction={vi.fn()}
        onEdit={vi.fn()}
        onOpenOriginal={vi.fn()}
        {...props}
      />
    </TooltipProvider>
  );

const footerRow = () => {
  const row = screen.getByText('Page net').closest('tr');
  if (!row) throw new Error('Page net label is not inside a table row');
  return within(row);
};

describe('TransactionsTable amount footer', () => {
  beforeEach(async () => {
    await ensureTransactionColumnLayoutHydrated();
    useTransactionColumnLayoutStore.getState().reset();
  });

  it('nets the signed amounts of the rows on screen', () => {
    renderTable({
      transactions: [
        { ...mockTransactionRow(), id: 'a', type: 'expense', amount: 2_500 },
        { ...mockTransactionRow(), id: 'b', type: 'income', amount: 10_000 },
        { ...mockTransactionRow(), id: 'c', type: 'transfer', amount: 99_999 },
      ],
      total: 40,
    });

    expect(footerRow().getByText('+$75.00')).toBeInTheDocument();
  });

  it('keeps the page net label beside the total when amount is first', () => {
    useTransactionColumnLayoutStore
      .getState()
      .setOrder([
        'amount',
        'date',
        'type',
        'description',
        'category',
        'account',
        'assignees',
        'tags',
        'actions',
      ]);
    renderTable({
      transactions: [
        { ...mockTransactionRow(), id: 'a', type: 'expense', amount: 2_500 },
        { ...mockTransactionRow(), id: 'b', type: 'income', amount: 10_000 },
      ],
      total: 2,
    });

    const label = screen.getByText('Page net');
    expect(label.closest('td')).toHaveTextContent('+$75.00');
  });
});
