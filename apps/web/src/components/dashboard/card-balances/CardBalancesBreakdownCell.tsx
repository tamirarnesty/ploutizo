import { useMemo } from 'react';
import type { SettlementAccountRow } from '@ploutizo/types';
import { buildMemberChartVisualSlots } from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';
import { CardBalancesBreakdownMemberChips } from '@/components/dashboard/card-balances/CardBalancesBreakdownMemberChips';
import { CardBalancesBreakdownSegmentBar } from '@/components/dashboard/card-balances/CardBalancesBreakdownSegmentBar';

export type AttributionSlice =
  | {
      kind: 'member';
      memberId: string;
      name: string;
      balanceCents: number;
    }
  | {
      kind: 'shared';
      balanceCents: number;
    };

export const buildAttributionSlices = (
  account: SettlementAccountRow
): AttributionSlice[] => {
  const memberSlices: AttributionSlice[] = [...account.members]
    .sort((a, b) => a.member.id.localeCompare(b.member.id))
    .filter((m) => m.personalBalanceCents !== 0)
    .map((m) => ({
      kind: 'member' as const,
      memberId: m.member.id,
      name: m.member.name,
      balanceCents: m.personalBalanceCents,
    }));

  if (account.sharedBalanceCents !== 0) {
    memberSlices.push({
      kind: 'shared',
      balanceCents: account.sharedBalanceCents,
    });
  }

  return memberSlices;
};

type CardBalancesBreakdownCellProps = {
  account: SettlementAccountRow;
};

/** Segmented balance bar + themed member badges with first-name + signed dollar amount. */
export const CardBalancesBreakdownCell = ({
  account,
}: CardBalancesBreakdownCellProps) => {
  const slices = useMemo(() => buildAttributionSlices(account), [account]);

  const memberIds = useMemo(
    () =>
      slices
        .filter(
          (s): s is Extract<AttributionSlice, { kind: 'member' }> =>
            s.kind === 'member'
        )
        .map((s) => s.memberId),
    [slices]
  );

  const { dotClasses, segmentClasses } = useMemo(
    () => buildMemberChartVisualSlots(memberIds),
    [memberIds]
  );

  return (
    <div className="min-w-0 space-y-2.5 p-1">
      <CardBalancesBreakdownSegmentBar
        slices={slices}
        memberSegmentClassMap={segmentClasses}
      />
      <CardBalancesBreakdownMemberChips
        slices={slices}
        memberChartClassMap={dotClasses}
      />
    </div>
  );
};
