import { cn } from '@ploutizo/ui/lib/utils';
import type { SettlementMemberRow } from '@ploutizo/types';
import type { MemberChartSegmentSlotClassMap } from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';
import { MEMBER_CHART_SEGMENT_CLASSES } from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';

export type CardBalancesBreakdownSegmentBarProps = {
  members: readonly SettlementMemberRow[];
  memberSegmentClassMap: MemberChartSegmentSlotClassMap;
};

export const CardBalancesBreakdownSegmentBar = ({
  members,
  memberSegmentClassMap,
}: CardBalancesBreakdownSegmentBarProps) => (
  <div
    className={cn(
      'flex h-2 w-full min-w-[8rem] overflow-hidden rounded-full border border-border/80',
      'bg-accent/85 dark:bg-secondary/55'
    )}
    aria-hidden
    role="presentation"
  >
    {members.map((m) => {
      const fillClass =
        memberSegmentClassMap.get(m.member.id) ??
        MEMBER_CHART_SEGMENT_CLASSES[0];
      const weight = Math.max(Math.abs(m.balanceCents), 0);

      return (
        <div
          key={`seg-${m.member.id}`}
          className={cn('h-full overflow-hidden', fillClass)}
          style={{
            flexGrow: weight,
            flexBasis: 0,
            minWidth: weight > 0 ? 2 : 0,
          }}
        />
      );
    })}
  </div>
);
