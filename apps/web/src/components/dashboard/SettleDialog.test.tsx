import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettleDialog } from '@/components/dashboard/SettleDialog';
import {
  expectOverlayMounted,
  expectOverlayUnmounted,
} from '@/test/overlayCloseContract';
import { mockSettlementAccount } from '@/test/overlayFixtures';

vi.mock('@/components/dashboard/settle-dialog/SettleDialogForm', () => ({
  SettleDialogForm: () => <div data-testid="settle-dialog-form" />,
}));

describe('SettleDialog overlay contract', () => {
  it('unmounts when idle (closed and no account)', () => {
    const { container } = render(
      <SettleDialog open={false} account={null} onClose={vi.fn()} />
    );

    expectOverlayUnmounted(container, 'dialog');
    expect(container).toBeEmptyDOMElement();
  });

  it('stays mounted when closed but account is still set (exit animation)', () => {
    const { container } = render(
      <SettleDialog
        open={false}
        account={mockSettlementAccount()}
        onClose={vi.fn()}
        initialPayToward="mAda"
      />
    );

    expectOverlayMounted(container, 'dialog');
    expect(screen.getByTestId('settle-dialog-form')).toBeInTheDocument();
  });

  it('renders form when open with account', () => {
    render(
      <SettleDialog
        open
        account={mockSettlementAccount()}
        onClose={vi.fn()}
        initialPayToward="mAda"
      />
    );

    expect(screen.getByTestId('settle-dialog-form')).toBeInTheDocument();
  });

  it('calls onClose when dialog requests close', () => {
    const onClose = vi.fn();
    render(
      <SettleDialog
        open
        account={mockSettlementAccount()}
        onClose={onClose}
        initialPayToward="mAda"
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    closeButton.click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
