import { render, screen } from '@testing-library/react';
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

describe('TransactionsTable amount footer', () => {
  it('shows the loaded-page sum under the amount column', () => {
    render(
      <TooltipProvider delay={0}>
        <TransactionsTable
          transactions={[mockTransactionRow()]}
          total={1}
          pageAmountSumCents={-5}
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
        />
      </TooltipProvider>
    );

    expect(screen.getAllByText('−$0.05').length).toBeGreaterThanOrEqual(2);
  });

  it('shows $0.00 in the footer when the loaded page has no rows', () => {
    render(
      <TooltipProvider delay={0}>
        <TransactionsTable
          transactions={[]}
          total={0}
          pageAmountSumCents={0}
          isLoading={false}
          page={1}
          limit={25}
          sort="date"
          order="desc"
          onPageChange={vi.fn()}
          onLimitChange={vi.fn()}
          onSortChange={vi.fn()}
          onFilteredEmpty={true}
          onClearFilters={vi.fn()}
          onEdit={vi.fn()}
          onOpenOriginal={vi.fn()}
        />
      </TooltipProvider>
    );

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('omits the footer while the list response is missing', () => {
    render(
      <TooltipProvider delay={0}>
        <TransactionsTable
          transactions={[mockTransactionRow()]}
          total={22}
          isLoading={true}
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
        />
      </TooltipProvider>
    );

    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.queryByText('−$0.05')).not.toBeInTheDocument();
  });
});
