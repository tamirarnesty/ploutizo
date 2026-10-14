import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
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
        onEdit={vi.fn()}
        onOpenOriginal={vi.fn()}
        {...props}
      />
    </TooltipProvider>
  );

const footerRow = () => {
  const row = screen.getByText('Total').closest('tr');
  if (!row) throw new Error('Total label is not inside a table row');
  return within(row);
};

describe('TransactionsTable amount footer', () => {
  it('shows the filtered-set total under the amount column, not the page sum', () => {
    renderTable({
      transactions: [{ ...mockTransactionRow(), amount: 5 }],
      total: 22,
      amountSumCents: 123_456,
    });

    expect(footerRow().getByText('+$1,234.56')).toBeInTheDocument();
  });

  it('keeps the filtered empty copy and a $0.00 footer when filters match nothing', () => {
    renderTable({
      amountSumCents: 0,
      onFilteredEmpty: true,
    });

    expect(
      screen.getByText('No transactions match your filters')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear filters' })
    ).toBeInTheDocument();
    expect(footerRow().getByText('$0.00')).toBeInTheDocument();
  });

  it('keeps the plain empty copy and a $0.00 footer when no filters are active', () => {
    renderTable({ amountSumCents: 0 });

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(footerRow().getByText('$0.00')).toBeInTheDocument();
  });

  it('shows no footer while the list response is missing', () => {
    renderTable({ isLoading: true });

    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });
});
