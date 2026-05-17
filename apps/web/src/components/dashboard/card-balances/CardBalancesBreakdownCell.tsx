import { useMemo } from 'react';
import type { SettlementAccountRow } from '@ploutizo/types';
import { buildMemberChartVisualSlots } from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';
import { CardBalancesBreakdownMemberChips } from '@/components/dashboard/card-balances/CardBalancesBreakdownMemberChips';
import { CardBalancesBreakdownSegmentBar } from '@/components/dashboard/card-balances/CardBalancesBreakdownSegmentBar';

type CardBalancesBreakdownCellProps = {
  account: SettlementAccountRow;
};

/** Segmented balance bar + themed member badges with first-name + dollar amount. */
export const CardBalancesBreakdownCell = ({
  account,
}: CardBalancesBreakdownCellProps) => {
  const memberIds = useMemo(
    () => account.members.map((m) => m.member.id),
    [account.members]
  );

  const { dotClasses, segmentClasses } = useMemo(
    () => buildMemberChartVisualSlots(memberIds),
    [memberIds]
  );

  return (
    <div className="min-w-0 space-y-2.5 p-1">
      <CardBalancesBreakdownSegmentBar
        members={account.members}
        memberSegmentClassMap={segmentClasses}
      />
      <CardBalancesBreakdownMemberChips
        members={account.members}
        memberChartClassMap={dotClasses}
      />
    </div>
  );
};
