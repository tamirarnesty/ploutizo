import '@/test/mockTanstackRouter';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountSlotEmptyState } from './AccountSlotEmptyState';

describe('AccountSlotEmptyState', () => {
  it('explains the gap and links to Accounts to create an eligible account', () => {
    render(<AccountSlotEmptyState label="Source" />);

    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(
      screen.getByText(/no eligible account is available/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /create one in accounts/i })
    ).toHaveAttribute('href', '/accounts');
  });
});
