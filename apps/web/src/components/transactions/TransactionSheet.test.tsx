import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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
    <div data-testid="transaction-form-mock">
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
        onSheetOpenChange={vi.fn()}
        onClose={vi.fn()}
      >
        <span />
      </TransactionSheet>
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
        onSheetOpenChange={vi.fn()}
        onClose={onClose}
      >
        <span />
      </TransactionSheet>
    );

    await user.click(screen.getByRole('button', { name: /close sheet/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('unmounts the form while the sheet is closed', () => {
    const { rerender } = render(
      <TransactionSheet
        open
        transaction={mockTransactionRow()}
        onSheetOpenChange={vi.fn()}
        onClose={vi.fn()}
      >
        <span />
      </TransactionSheet>
    );

    expect(screen.getByTestId('transaction-form-mock')).toBeInTheDocument();

    rerender(
      <TransactionSheet
        open={false}
        transaction={mockTransactionRow()}
        onSheetOpenChange={vi.fn()}
        onClose={vi.fn()}
      >
        <span />
      </TransactionSheet>
    );

    expect(
      screen.queryByTestId('transaction-form-mock')
    ).not.toBeInTheDocument();
  });

  it('reopens clean after discard so closing does not prompt again', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const Harness = () => {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Reopen sheet
          </button>
          <TransactionSheet
            open={open}
            transaction={null}
            onSheetOpenChange={setOpen}
            onClose={() => {
              onClose();
              setOpen(false);
            }}
          >
            <span />
          </TransactionSheet>
        </>
      );
    };

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /mark dirty/i }));
    await user.click(screen.getByRole('button', { name: /close sheet/i }));
    await user.click(screen.getByRole('button', { name: /^discard$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    await user.click(screen.getByRole('button', { name: /reopen sheet/i }));
    await user.click(screen.getByRole('button', { name: /close sheet/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens discard alert instead of onClose when form is dirty', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TransactionSheet
        open
        transaction={null}
        onSheetOpenChange={vi.fn()}
        onClose={onClose}
      >
        <span />
      </TransactionSheet>
    );

    await user.click(screen.getByRole('button', { name: /mark dirty/i }));

    await user.click(screen.getByRole('button', { name: /close sheet/i }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/discard changes/i)).toBeInTheDocument();
  });
});
