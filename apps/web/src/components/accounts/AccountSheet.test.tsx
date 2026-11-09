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
  it('keeps sheet content mounted through the close animation', () => {
    const account = mockAccount();
    const { rerender } = render(
      <AccountSheet open account={account} onOpenChange={vi.fn()} />
    );

    expect(screen.getByText('Edit account')).toBeInTheDocument();

    rerender(
      <AccountSheet open={false} account={account} onOpenChange={vi.fn()} />
    );

    expectOverlayMounted('sheet');
    expect(screen.getByText('Edit account')).toBeInTheDocument();
  });

  it('keeps sheet content mounted through the close animation in create mode', () => {
    const { rerender } = render(
      <AccountSheet open account={null} onOpenChange={vi.fn()} />
    );

    expect(screen.getByText('Add account')).toBeInTheDocument();

    rerender(
      <AccountSheet open={false} account={null} onOpenChange={vi.fn()} />
    );

    expectOverlayMounted('sheet');
    expect(screen.getByText('Add account')).toBeInTheDocument();
  });

  it('renders the trigger and opens via onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onTriggerClick = vi.fn();

    render(
      <AccountSheet
        open={false}
        account={null}
        onOpenChange={onOpenChange}
        trigger={
          <button type="button" onClick={onTriggerClick}>
            Add account
          </button>
        }
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add account' }));

    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(true);
  });

  it('calls onOpenChange(false) from form without requiring account to clear', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const account = mockAccount();

    render(<AccountSheet open account={account} onOpenChange={onOpenChange} />);

    await user.click(
      screen.getByRole('button', { name: /close account form/i })
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
