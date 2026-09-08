import { useMemo } from 'react';
import type { CardBalanceRowViewModel } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';
import { buildMemberChartVisualSlots } from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';
import { CardBalancesBreakdownMemberChips } from '@/components/dashboard/card-balances/CardBalancesBreakdownMemberChips';
import { CardBalancesBreakdownSegmentBar } from '@/components/dashboard/card-balances/CardBalancesBreakdownSegmentBar';

type CardBalancesBreakdownCellProps = {
  row: CardBalanceRowViewModel;
};

/** Segmented balance bar + themed member badges with first-name + signed dollar amount. */
export const CardBalancesBreakdownCell = ({
  row,
}: CardBalancesBreakdownCellProps) => {
  const memberIds = useMemo(
    () =>
      row.attributionChips
        .filter((chip) => chip.kind === 'member')
        .map((chip) => chip.memberId),
    [row.attributionChips]
  );

  const { dotClasses, segmentClasses } = useMemo(
    () => buildMemberChartVisualSlots(memberIds),
    [memberIds]
  );

  return (
    <div className="min-w-0 space-y-2.5 p-1">
      <CardBalancesBreakdownSegmentBar
        chips={row.attributionChips}
        memberSegmentClassMap={segmentClasses}
      />
      <CardBalancesBreakdownMemberChips
        chips={row.attributionChips}
        memberChartClassMap={dotClasses}
      />
    </div>
  );
};
