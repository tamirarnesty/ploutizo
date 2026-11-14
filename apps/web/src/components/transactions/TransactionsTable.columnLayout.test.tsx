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

  it('overlays the reorder grip on the right until the header is hovered or focused', () => {
    renderTable();
    const header = amountHeader();
    const grip = within(header).getByRole('button', {
      name: 'Drag to reorder',
    });

    expect(header).toHaveClass('group/column-header');
    expect(grip).toHaveClass(
      'absolute',
      'end-5',
      'pointer-events-none',
      'opacity-0'
    );
    expect(grip.className).toContain('group-hover/column-header:opacity-100');
    expect(grip.className).toContain(
      'group-focus-within/column-header:opacity-100'
    );
    expect(grip.className).toContain('[@media(hover:none)]:opacity-100');
    expect(grip).toHaveAttribute('tabindex', '0');

    const title = header.querySelector('.grow');
    expect(title?.className).toContain('group-hover/column-header:pe-8');
    expect(title?.className).not.toMatch(/(?:^|\s)pe-8(?:\s|$)/);
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

  it('right-aligns Amount when it is the last data column', () => {
    renderTable({
      transactions: [
        { ...mockTransactionRow(), type: 'expense', amount: 2_500 },
      ],
    });

    expect(amountHeader().querySelector('.ms-auto')).not.toBeNull();
    expect(amountValue()).toHaveClass('text-right');
  });

  it('left-aligns Amount when another data column follows it', () => {
    useTransactionColumnLayoutStore
      .getState()
      .setOrder([
        'date',
        'amount',
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
        { ...mockTransactionRow(), type: 'expense', amount: 2_500 },
      ],
    });

    expect(amountHeader().querySelector('.ms-auto')).toBeNull();
    expect(amountValue()).not.toHaveClass('text-right');
  });

  it('left-aligns the Amount loading placeholder when another data column follows it', () => {
    useTransactionColumnLayoutStore
      .getState()
      .setOrder([
        'date',
        'amount',
        'type',
        'description',
        'category',
        'account',
        'assignees',
        'tags',
        'actions',
      ]);
    renderTable({ isLoading: true, transactions: [] });

    expect(
      document.querySelector('tbody')?.querySelector('.ml-auto')
    ).toBeNull();
  });
});

const amountHeader = () => {
  const header = screen
    .getAllByRole('columnheader')
    .find((cell) => cell.textContent.includes('Amount'));
  if (!header) throw new Error('Amount header is missing');
  return header;
};

const amountValue = () => {
  const body = document.querySelector('tbody');
  if (!body) throw new Error('transactions table body is missing');
  return within(body).getByText('−$25.00');
};
