import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectOverlayMounted } from '@/test/overlayCloseContract';
import { ConfirmDestructiveDialog } from './ConfirmDestructiveDialog';

const baseProps = {
  title: 'Delete transaction?',
  description: 'This cannot be undone.',
  confirmLabel: 'Delete',
};

describe('ConfirmDestructiveDialog overlay contract', () => {
  it('keeps the alert dialog mounted through the close animation', () => {
    const { rerender } = render(
      <ConfirmDestructiveDialog
        {...baseProps}
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    rerender(
      <ConfirmDestructiveDialog
        {...baseProps}
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expectOverlayMounted('alertDialog');
    expect(
      screen.getByRole('heading', { name: /delete transaction/i })
    ).toBeInTheDocument();
  });

  it('calls onConfirm and onOpenChange(false) when confirming', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmDestructiveDialog
        {...baseProps}
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) when canceling', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ConfirmDestructiveDialog
        {...baseProps}
        open
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
  });

  it('opens from the icon trigger and confirms', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmDestructiveDialog
        {...baseProps}
        trigger="icon"
        triggerAriaLabel="Remove item"
        triggerTooltip="Remove"
        onConfirm={onConfirm}
      />
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove item' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
  });
});
