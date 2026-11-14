import '@/test/mockTanstackRouter';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog';
import { Transactions } from './Transactions';

vi.mock('@/lib/data-access/transactions', () => ({
  useGetTransactions: () => ({
    data: { data: [], total: 0 },
    isLoading: false,
  }),
}));

vi.mock('@/lib/data-access/accounts', () => ({
  useGetAccounts: () => ({ data: [] }),
}));

vi.mock('@/lib/data-access/categories', () => ({
  useGetCategories: () => ({ data: [] }),
}));

vi.mock('@/lib/data-access/household', () => ({
  useGetHouseholdMembers: () => ({ data: [] }),
}));

vi.mock('@/lib/data-access/tags', () => ({
  useGetTags: () => ({ data: [] }),
}));

vi.mock('@/hooks/persistedPageSize', () => ({
  useTablePageSize: () => ({ pageSize: 25, setPageSize: vi.fn() }),
  usePersistedPageSize: () => ({ pageSize: 25, setPageSize: vi.fn() }),
}));

// The table is stubbed, but its delete dialog is the real
// ConfirmDestructiveDialog — the same component TransactionsTable renders.
// TransactionSheet stays real so Base UI's nested-dialog detection applies:
// if page content ever moves back inside the Sheet root, this dialog loses
// its backdrop and the overlay assertion below fails.
vi.mock('./TransactionsTable', () => ({
  TransactionsTable: () => (
    <ConfirmDestructiveDialog
      trigger={<button type="button">Delete transaction</button>}
      title="Delete transaction?"
      description="This will permanently remove this transaction."
      confirmLabel="Delete transaction"
      onConfirm={vi.fn()}
    />
  ),
}));

vi.mock('./TransactionForm', () => ({
  TransactionForm: () => <div>Transaction form</div>,
}));

describe('Transactions page overlay composition', () => {
  it('keeps the table delete dialog backdrop while the sheet is closed', async () => {
    const user = userEvent.setup();
    render(<Transactions />);

    await user.click(
      screen.getByRole('button', { name: 'Delete transaction' })
    );

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    // Nested-dialog detection: if the sheet root wraps this dialog, the
    // backdrop is omitted. Role alone would still pass.
    expect(
      // eslint-disable-next-line testing-library/no-node-access -- see comment
      document.querySelector('[data-slot="alert-dialog-overlay"]')
    ).toBeInTheDocument();
  });
});
