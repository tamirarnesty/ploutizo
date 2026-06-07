import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccountSheet } from '@/components/accounts/AccountSheet';
import { expectOverlayMounted } from '@/test/overlayCloseContract';
import { mockAccount } from '@/test/overlayFixtures';

vi.mock('@/lib/data-access/accounts', () => ({
  useArchiveAccount: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/components/accounts/AccountForm', () => ({
  AccountForm: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      Close account form
    </button>
  ),
}));

describe('AccountSheet overlay contract', () => {
  it('keeps sheet root mounted when closed with account still set', () => {
    const { container } = render(
      <AccountSheet open={false} account={mockAccount()} onClose={vi.fn()} />
    );

    expectOverlayMounted(container, 'sheet');
    expect(screen.getByText('Edit account')).toBeInTheDocument();
  });

  it('keeps sheet root mounted when closed in create mode', () => {
    const { container } = render(
      <AccountSheet open={false} account={null} onClose={vi.fn()} />
    );

    expectOverlayMounted(container, 'sheet');
    expect(screen.getByText('Add account')).toBeInTheDocument();
  });

  it('calls onClose from form without requiring account to clear', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const account = mockAccount();

    render(<AccountSheet open account={account} onClose={onClose} />);

    await user.click(
      screen.getByRole('button', { name: /close account form/i })
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
