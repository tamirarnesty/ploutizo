import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TransactionSheet } from '@/components/transactions/TransactionSheet';
import { expectOverlayMounted } from '@/test/overlayCloseContract';
import { mockTransactionRow } from '@/test/overlayFixtures';

vi.mock('@/components/transactions/TransactionForm', () => ({
  TransactionForm: ({
    onClose,
    onDirtyChange,
  }: {
    onClose: () => void;
    onDirtyChange?: (dirty: boolean) => void;
  }) => (
    <div>
      <button type="button" onClick={onClose}>
        Close transaction form
      </button>
      <button type="button" onClick={() => onDirtyChange?.(true)}>
        Mark dirty
      </button>
    </div>
  ),
}));

describe('TransactionSheet overlay contract', () => {
  it('keeps sheet root mounted when closed with transaction still set', () => {
    const { container } = render(
      <TransactionSheet
        open={false}
        transaction={mockTransactionRow()}
        onClose={vi.fn()}
      />
    );

    expectOverlayMounted(container, 'sheet');
    expect(screen.getByText('Edit transaction')).toBeInTheDocument();
  });

  it('calls onClose when sheet dismisses and form is clean', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TransactionSheet
        open
        transaction={mockTransactionRow()}
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /close sheet/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens discard alert instead of onClose when form is dirty', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<TransactionSheet open transaction={null} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /mark dirty/i }));

    await user.click(screen.getByRole('button', { name: /close sheet/i }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/discard changes/i)).toBeInTheDocument();
  });
});
