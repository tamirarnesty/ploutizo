import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRouterMocks, routerMocks } from '@/test/mockTanstackRouter';
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

describe('Transactions page', () => {
  beforeEach(() => {
    resetRouterMocks();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the new-transaction sheet from the shortcut search param', async () => {
    routerMocks.search = { create: true };
    const { rerender } = render(<Transactions />);

    expect(await screen.findByText('Transaction form')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Add transaction' })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalledTimes(1);
    });
    const [navigation] = routerMocks.navigate.mock.calls[0] as [
      {
        to: string;
        replace?: boolean;
        search: (prev: { create?: true; page?: number; type?: string }) => {
          create?: true;
          page?: number;
          type?: string;
        };
      },
    ];
    expect(navigation.to).toBe('/transactions');
    expect(navigation.replace).toBe(true);
    expect(
      navigation.search({ create: true, page: 2, type: 'expense' })
    ).toEqual({ page: 2, type: 'expense' });

    routerMocks.search = {};
    rerender(<Transactions />);
    expect(screen.getByText('Transaction form')).toBeInTheDocument();
  });

  it('does not open the new-transaction sheet while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    routerMocks.search = { create: true };
    render(<Transactions />);
    await act(async () => {});

    expect(routerMocks.navigate).not.toHaveBeenCalled();
    expect(screen.queryByText('Transaction form')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add transaction' })
    ).toBeInTheDocument();
  });
});

describe('Transactions page overlay composition', () => {
  beforeEach(() => {
    resetRouterMocks();
  });

  it('keeps the table delete dialog backdrop while the sheet is closed', async () => {
    const user = userEvent.setup();
    render(<Transactions />);

    await user.click(
      screen.getByRole('button', { name: 'Delete transaction' })
    );

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="alert-dialog-overlay"]')
    ).toBeInTheDocument();
  });
});
