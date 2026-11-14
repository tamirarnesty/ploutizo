import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { TRANSACTION_COLUMN_IDS } from '@/lib/prefs/transactionColumnLayout';
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
  props: Partial<ComponentProps<typeof TransactionsTable>> = {}
) =>
  render(
    <TooltipProvider delay={0}>
      <TransactionsTable
        transactions={[mockTransactionRow()]}
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
        onAddTransaction={vi.fn()}
        onEdit={vi.fn()}
        onOpenOriginal={vi.fn()}
        {...props}
      />
    </TooltipProvider>
  );

const headerLabels = () =>
  screen
    .getAllByRole('columnheader')
    .map((header) =>
      header.textContent.replaceAll('Drag to reorder', '').trim()
    );

describe('TransactionsTable column layout', () => {
  beforeEach(async () => {
    await ensureTransactionColumnLayoutHydrated();
    useTransactionColumnLayoutStore.getState().reset();
  });

  it('offers a drag grip on every data column and not on actions', () => {
    renderTable();
    const grips = screen.getAllByRole('button', { name: 'Drag to reorder' });
    expect(grips).toHaveLength(TRANSACTION_COLUMN_IDS.length - 1);
    const actionsHeader = screen.getAllByRole('columnheader').at(-1);
    expect(actionsHeader).toBeDefined();
    expect(
      within(actionsHeader!).queryByRole('button', { name: 'Reset columns' })
    ).not.toBeInTheDocument();
  });

  it('renders a saved sequence with actions still last', () => {
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
    renderTable();
    const headers = screen.getAllByRole('columnheader');
    expect(headerLabels()).toEqual([
      'Amount',
      'Date',
      'Type',
      'Description',
      'Category',
      'Account',
      'Assignees',
      'Tags',
      '',
    ]);
    expect(
      within(headers.at(-1)!).getByRole('button', { name: 'Reset columns' })
    ).toBeInTheDocument();
  });
});
