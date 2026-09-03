import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, AccountMember } from '@ploutizo/types';
import { AccountForm } from '@/components/accounts/AccountForm';

const ADA_ID = '123e4567-e89b-12d3-a456-426614174000';
const ALAN_ID = '123e4567-e89b-12d3-a456-426614174001';

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  accountMembers: [] as AccountMember[],
}));

vi.mock('@clerk/tanstack-react-start', () => ({
  useUser: () => ({ user: { id: 'user_1' } }),
}));

vi.mock('@/lib/data-access/accounts', () => ({
  useGetAccountMembers: () => ({
    data: mocks.accountMembers,
    isLoading: false,
  }),
  useCreateAccount: () => ({ mutate: mocks.createMutate }),
  useUpdateAccount: () => ({ mutate: mocks.updateMutate }),
}));

vi.mock('@/lib/data-access/org', () => ({
  useGetOrgMembers: () => ({
    data: [
      {
        id: ADA_ID,
        externalId: 'user_1',
        displayName: 'Ada',
        imageUrl: null,
      },
      {
        id: ALAN_ID,
        externalId: 'user_2',
        displayName: 'Alan',
        imageUrl: null,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@ploutizo/ui/components/select', async () => {
  const React = await import('react');
  const SelectChangeContext = React.createContext<(value: string) => void>(
    () => {}
  );

  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
    }) =>
      React.createElement(
        SelectChangeContext.Provider,
        { value: onValueChange ?? (() => {}) },
        children
      ),
    SelectTrigger: ({
      id,
      children,
    }: {
      id?: string;
      children: React.ReactNode;
    }) => React.createElement('div', { id }, children),
    SelectValue: ({
      placeholder,
      children,
    }: {
      placeholder?: string;
      children?: React.ReactNode;
    }) => React.createElement('span', null, placeholder ?? children),
    SelectContent: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', null, children),
    SelectGroup: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', null, children),
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => {
      const onValueChange = React.useContext(SelectChangeContext);
      return React.createElement(
        'button',
        { type: 'button', onClick: () => onValueChange(value) },
        children
      );
    },
  };
});

vi.mock('@ploutizo/ui/components/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

const accountFixture = (overrides: Partial<Account> = {}): Account => ({
  id: 'acct_1',
  orgId: 'org_1',
  name: 'Joint Chequing',
  type: 'chequing',
  institutionId: 'td',
  lastFour: '4410',
  statementDueDay: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  owners: [],
  ...overrides,
});

describe('AccountForm', () => {
  beforeEach(() => {
    mocks.createMutate.mockReset();
    mocks.updateMutate.mockReset();
    mocks.accountMembers = [];
  });

  it('presents a fixed Financial institution dropdown instead of free text', () => {
    render(<AccountForm account={null} onClose={vi.fn()} />);

    expect(
      screen.queryByPlaceholderText('e.g. TD Bank')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Financial institution')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TD' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RBC' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Tangerine' })
    ).not.toBeInTheDocument();
  });

  it('does not offer a Personal / Shared ownership toggle', () => {
    render(<AccountForm account={null} onClose={vi.fn()} />);

    expect(screen.queryByText('Personal')).not.toBeInTheDocument();
    expect(screen.queryByText('Shared')).not.toBeInTheDocument();
    expect(screen.getByText('Owners')).toBeInTheDocument();
  });

  it('pre-selects the current member on create', () => {
    render(<AccountForm account={null} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Ada' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('requires a Financial institution for chequing accounts', async () => {
    const user = userEvent.setup();
    render(<AccountForm account={null} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Joint Chequing');
    await user.click(screen.getByRole('button', { name: 'Add account' }));

    await waitFor(() => {
      expect(
        screen.getByText('Financial institution is required.')
      ).toBeInTheDocument();
    });
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('submits the selected Financial institution id when editing', async () => {
    const user = userEvent.setup();
    mocks.accountMembers = [
      { id: 'am_1', accountId: 'acct_1', memberId: ADA_ID },
    ];
    render(<AccountForm account={accountFixture()} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mocks.updateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Joint Chequing',
          type: 'chequing',
          institutionId: 'td',
          memberIds: [ADA_ID],
          statementDueDay: null,
        }),
        expect.any(Object)
      );
    });
  });

  it('allows cash accounts without a Financial institution', async () => {
    const user = userEvent.setup();
    mocks.accountMembers = [
      { id: 'am_cash', accountId: 'acct_cash', memberId: ADA_ID },
    ];
    render(
      <AccountForm
        account={accountFixture({
          id: 'acct_cash',
          name: 'Wallet',
          type: 'prepaid_cash',
          institutionId: null,
          lastFour: null,
        })}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByText('Financial institution (optional)')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mocks.updateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wallet',
          type: 'prepaid_cash',
          institutionId: null,
          statementDueDay: null,
        }),
        expect.any(Object)
      );
    });
  });

  it('blocks save when an account has zero owners', async () => {
    const user = userEvent.setup();
    render(<AccountForm account={accountFixture()} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(
        screen.getByText('At least one owner is required.')
      ).toBeInTheDocument();
    });
    expect(mocks.updateMutate).not.toHaveBeenCalled();
  });

  it('shows statement due day only for credit cards and keeps the typed day', async () => {
    const user = userEvent.setup();
    render(<AccountForm account={null} onClose={vi.fn()} />);

    expect(
      screen.getByTestId('account-statement-due-day-wrap')
    ).toHaveAttribute('aria-hidden', 'true');

    await user.click(screen.getByRole('button', { name: 'Credit Card' }));
    expect(
      screen.getByTestId('account-statement-due-day-wrap')
    ).toHaveAttribute('aria-hidden', 'false');
    const dueDay = screen.getByLabelText('Statement due day (optional)');

    await user.type(dueDay, '15');
    await user.click(screen.getByRole('button', { name: 'Chequing' }));
    expect(
      screen.getByTestId('account-statement-due-day-wrap')
    ).toHaveAttribute('aria-hidden', 'true');

    await user.click(screen.getByRole('button', { name: 'Credit Card' }));
    expect(screen.getByLabelText('Statement due day (optional)')).toHaveValue(
      '15'
    );
  });

  it('opens a credit card already split with the due day prefilled', () => {
    mocks.accountMembers = [
      { id: 'am_1', accountId: 'acct_1', memberId: ADA_ID },
    ];
    render(
      <AccountForm
        account={accountFixture({
          name: 'Visa',
          type: 'credit_card',
          lastFour: '4242',
          statementDueDay: 15,
        })}
        onClose={vi.fn()}
      />
    );

    const dueDay = screen.getByLabelText('Statement due day (optional)');
    expect(
      screen.getByTestId('account-statement-due-day-wrap')
    ).toHaveAttribute('aria-hidden', 'false');
    expect(dueDay).toHaveValue('15');
    expect(screen.getByTestId('account-last-four-row').className).toContain(
      'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
    );
  });

  it('persists statementDueDay on credit cards and null on other types', async () => {
    const user = userEvent.setup();
    render(<AccountForm account={null} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Visa');
    await user.click(screen.getByRole('button', { name: 'Credit Card' }));
    await user.click(screen.getByRole('button', { name: 'TD' }));
    await user.type(
      screen.getByLabelText('Statement due day (optional)'),
      '15'
    );
    await user.click(screen.getByRole('button', { name: 'Add account' }));

    await waitFor(() => {
      expect(mocks.createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'credit_card',
          statementDueDay: 15,
          memberIds: [ADA_ID],
        }),
        expect.any(Object)
      );
    });
  });
});
