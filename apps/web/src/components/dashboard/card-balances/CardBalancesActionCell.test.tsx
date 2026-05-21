import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import type { SettlementAccountRow, SettlementStatus } from '@ploutizo/types';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import { CardBalancesActionCell } from '@/components/dashboard/card-balances/CardBalancesActionCell';

const makeAccount = (): SettlementAccountRow => ({
  account: {
    id: 'acct-1',
    name: 'Platinum',
    type: 'credit_card',
    institution: 'Coast',
    lastFour: '4242',
    statementDueDay: 15,
    owners: [
      { id: 'mAda', displayName: 'Ada Lovelace', imageUrl: null },
      { id: 'mAlan', displayName: 'Alan Turing', imageUrl: null },
    ],
  },
  totalBalanceCents: 5000,
  sharedBalanceCents: 1000,
  sharedParticipantIds: ['mAda', 'mAlan'],
  members: [
    {
      member: { id: 'mAda', name: 'Ada Lovelace', avatarUrl: null },
      personalBalanceCents: 3000,
    },
    {
      member: { id: 'mAlan', name: 'Alan Turing', avatarUrl: null },
      personalBalanceCents: 1000,
    },
  ],
  dueDate: '2026-05-31',
  status: 'on_track' as SettlementStatus,
});

describe('CardBalancesActionCell', () => {
  it('lists all members and Shared, then settles chosen member', async () => {
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
      name: /settle platinum/i,
    });
    await user.click(trigger);

    const menu = await screen.findByRole('menu');
    expect(
      within(menu).getByRole('menuitem', { name: /ada lovelace/i })
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: /alan turing/i })
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: /^shared/i })
    ).toBeInTheDocument();

    const ada = within(menu).getByRole('menuitem', { name: /ada lovelace/i });
    await user.click(ada);

    expect(onSettleClick).toHaveBeenCalledTimes(1);
    expect(onSettleClick.mock.calls[0]?.[1]).toEqual({
      kind: 'member',
      memberId: 'mAda',
    });
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    );
  });

  it('supports keyboard navigation to Shared target', async () => {
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
      name: /settle platinum/i,
    });

    trigger.focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');

    expect(onSettleClick.mock.calls[0]?.[1]).toEqual({ kind: 'shared' });
  });
});
