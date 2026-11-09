import { render, screen, waitFor } from '@testing-library/react';
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
  it('keeps sheet content mounted through the close animation', () => {
    const transaction = mockTransactionRow();
    const { rerender } = render(
      <TransactionSheet
        open
        transaction={transaction}
        onSheetOpenChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Edit transaction')).toBeInTheDocument();

    rerender(
      <TransactionSheet
        open={false}
        transaction={transaction}
        onSheetOpenChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expectOverlayMounted('sheet');
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
      />
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('unmounts the form while the sheet is closed', () => {
    const { rerender } = render(
      <TransactionSheet
        open
        transaction={mockTransactionRow()}
        onSheetOpenChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('transaction-form-mock')).toBeInTheDocument();

    rerender(
      <TransactionSheet
        open={false}
        transaction={mockTransactionRow()}
        onSheetOpenChange={vi.fn()}
        onClose={vi.fn()}
      />
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
          />
        </>
      );
    };

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /mark dirty/i }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: /^discard$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    await user.click(screen.getByRole('button', { name: /reopen sheet/i }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the trigger and opens via onSheetOpenChange', async () => {
    const user = userEvent.setup();
    const onSheetOpenChange = vi.fn();
    const onTriggerClick = vi.fn();

    render(
      <TransactionSheet
        open={false}
        transaction={null}
        onSheetOpenChange={onSheetOpenChange}
        onClose={vi.fn()}
        trigger={
          <button type="button" onClick={onTriggerClick}>
            Add transaction
          </button>
        }
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    expect(onSheetOpenChange).toHaveBeenCalledWith(true);
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
      />
    );

    await user.click(screen.getByRole('button', { name: /mark dirty/i }));

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/discard changes/i)).toBeInTheDocument();
  });
});
