import '@/test/mockTanstackRouter';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAppForm } from '@ploutizo/ui/components/form';
import type { Account, TransactionType } from '@ploutizo/types';
import { accountCreateRoute } from '@/lib/navigation';
import { buildDefaultValues } from './hooks/useTransactionForm';
import { TransactionAccountSlots } from './TransactionAccountSlots';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

const account = (
  overrides: Partial<Account> & Pick<Account, 'id' | 'name' | 'type'>
): Account =>
  ({
    orgId: 'org-1',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
    ...overrides,
  }) as Account;

const SlotsHarness = ({
  type,
  accounts,
}: {
  type: TransactionType;
  accounts: Account[];
}) => {
  const form = useAppForm({
    defaultValues: { ...buildDefaultValues(null), type },
  });

  return (
    <TransactionAccountSlots
      form={form as unknown as TransactionFormInstance}
      accounts={accounts}
    />
  );
};

describe('TransactionAccountSlots empty state', () => {
  it('shows a recoverable empty state for a required expense account slot', () => {
    render(<SlotsHarness type="expense" accounts={[]} />);

    expect(screen.getByTestId('account-slot-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /create one in accounts/i })
    ).toHaveAttribute(
      'data-router-state',
      JSON.stringify(accountCreateRoute('credit_card').state)
    );
  });

  it('shows empty states for both required settlement slots with role-derived types', () => {
    render(<SlotsHarness type="settlement" accounts={[]} />);

    expect(screen.getAllByTestId('account-slot-empty-state')).toHaveLength(2);
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Destination')).toBeInTheDocument();

    const links = screen.getAllByRole('link', {
      name: /create one in accounts/i,
    });
    expect(links[0]).toHaveAttribute(
      'data-router-state',
      JSON.stringify(accountCreateRoute('chequing').state)
    );
    expect(links[1]).toHaveAttribute(
      'data-router-state',
      JSON.stringify(accountCreateRoute('credit_card').state)
    );
    expect(links[0]?.getAttribute('href')).toBe('/accounts');
    expect(links[0]?.getAttribute('href')).not.toContain('?');
  });

  it('shows an empty destination when contribution has no investment account', () => {
    render(
      <SlotsHarness
        type="contribution"
        accounts={[
          account({ id: 'cheq-1', name: 'Chequing', type: 'chequing' }),
        ]}
      />
    );

    expect(screen.getAllByTestId('account-slot-empty-state')).toHaveLength(1);
    expect(screen.getByText('Destination')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(document.getElementById('tx-accountId')).toBeInTheDocument();
    expect(document.getElementById('tx-counterpartAccountId')).toBeNull();
    expect(
      screen.getByRole('link', { name: /create one in accounts/i })
    ).toHaveAttribute(
      'data-router-state',
      JSON.stringify(accountCreateRoute('investment').state)
    );
  });
});
