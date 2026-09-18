import '@/test/mockTanstackRouter';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { accountCreateRoute } from '@/lib/navigation';
import { AccountSlotEmptyState } from './AccountSlotEmptyState';

describe('AccountSlotEmptyState', () => {
  it('explains the gap and hands off to Accounts via router state', () => {
    render(
      <AccountSlotEmptyState label="Source" createAccountType="chequing" />
    );

    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(
      screen.getByText(/no eligible account is available/i)
    ).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /create one in accounts/i });
    expect(link).toHaveAttribute('href', '/accounts');
    expect(link).toHaveAttribute(
      'data-router-state',
      JSON.stringify(accountCreateRoute('chequing').state)
    );
    expect(link.getAttribute('href')).not.toContain('?');
  });

  it('prefills the first allowed account type for the missing role', () => {
    render(
      <AccountSlotEmptyState
        label="Destination"
        createAccountType="investment"
      />
    );

    expect(
      screen.getByRole('link', { name: /create one in accounts/i })
    ).toHaveAttribute(
      'data-router-state',
      JSON.stringify(accountCreateRoute('investment').state)
    );
  });
});
