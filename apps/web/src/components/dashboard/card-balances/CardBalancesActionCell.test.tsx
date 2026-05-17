import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import type { SettlementAccountRow, SettlementStatus } from '@ploutizo/types';
import { CardBalancesActionCell } from '@/components/dashboard/card-balances/CardBalancesActionCell';

const makeAccount = (): SettlementAccountRow => ({
  account: {
    id: 'acct-1',
    name: 'Platinum',
    type: 'credit_card',
    institution: 'Coast',
    lastFour: '4242',
    statementDueDay: 15,
  },
  totalBalanceCents: 5000,
  members: [
    {
      member: { id: 'mAda', name: 'Ada Lovelace', avatarUrl: null },
      balanceCents: 3000,
    },
    {
      member: { id: 'mAlan', name: 'Alan Turing', avatarUrl: null },
      balanceCents: 2000,
    },
  ],
  dueDate: '2026-05-31',
  status: 'on_track' as SettlementStatus,
});

describe('CardBalancesActionCell', () => {
  it('opens on click and settles the chosen member via pointer', async () => {
    const user = userEvent.setup();
    const onSettleClick =
      vi.fn<(...args: Parameters<CardBalancesSettleClickHandler>) => void>();

    render(
      <TooltipProvider delay={0}>
        <div className="group/row">
          <CardBalancesActionCell
            account={makeAccount()}
            onSettleClick={onSettleClick}
          />
        </div>
      </TooltipProvider>
    );

    const trigger = screen.getByRole('button', {
      name: /open settle actions for platinum/i,
    });
    await user.click(trigger);

    const menu = await screen.findByRole('menu');
    const ada = within(menu).getByRole('menuitem', { name: /ada lovelace/i });
    await user.click(ada);

    expect(onSettleClick).toHaveBeenCalledTimes(1);
    expect(onSettleClick.mock.calls[0]?.[1]?.member?.id).toBe('mAda');
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    );
  });

  it('supports Enter → Arrow navigation → Enter to choose, Esc closes returning focus', async () => {
    const user = userEvent.setup();
    const onSettleClick =
      vi.fn<(...args: Parameters<CardBalancesSettleClickHandler>) => void>();

    render(
      <TooltipProvider delay={0}>
        <div className="group/row">
          <CardBalancesActionCell
            account={makeAccount()}
            onSettleClick={onSettleClick}
          />
        </div>
      </TooltipProvider>
    );

    const trigger = screen.getByRole('button', {
      name: /open settle actions for platinum/i,
    });

    trigger.focus();
    await user.keyboard('{Enter}');

    await screen.findByRole('menu');

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(onSettleClick.mock.calls[0]?.[1]?.member?.id).toBe('mAlan');

    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    );

    trigger.focus();
    await user.keyboard(' ');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    );
    expect(trigger).toHaveFocus();
  });
});
