import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';
import { expectOverlayMounted } from '@/test/overlayCloseContract';

describe('DeleteTransactionDialog overlay contract', () => {
  it('stays mounted when closed (open driven by parent deleteId)', () => {
    const { container } = render(
      <DeleteTransactionDialog
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expectOverlayMounted(container, 'alertDialog');
    expect(
      screen.getByRole('heading', { name: /delete transaction/i })
    ).toBeInTheDocument();
  });

  it('calls onConfirm and onOpenChange(false) when deleting', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <DeleteTransactionDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    );

    await user.click(
      screen.getByRole('button', { name: /delete transaction/i })
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) when canceling', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <DeleteTransactionDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
  });
});
