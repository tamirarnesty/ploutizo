import { cn } from '@ploutizo/ui/lib/utils';
import type { AttributionSlice } from '@/components/dashboard/card-balances/CardBalancesBreakdownCell';
import type { MemberChartSegmentSlotClassMap } from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';
import {
  MEMBER_CHART_SEGMENT_CLASSES,
  SHARED_CHART_SEGMENT_CLASS,
} from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';

export type CardBalancesBreakdownSegmentBarProps = {
  slices: readonly AttributionSlice[];
  memberSegmentClassMap: MemberChartSegmentSlotClassMap;
};

export const CardBalancesBreakdownSegmentBar = ({
  slices,
  memberSegmentClassMap,
}: CardBalancesBreakdownSegmentBarProps) => (
  <div
    className={cn(
      'flex h-2 w-full min-w-[8rem] overflow-hidden rounded-full border border-border',
      'bg-muted'
    )}
    aria-hidden
    role="presentation"
  >
    {slices.map((slice) => {
      const weight = Math.max(Math.abs(slice.balanceCents), 0);
      const fillClass =
        slice.kind === 'shared'
          ? SHARED_CHART_SEGMENT_CLASS
          : (memberSegmentClassMap.get(slice.memberId) ??
            MEMBER_CHART_SEGMENT_CLASSES[0]);
      const key =
        slice.kind === 'shared' ? 'shared-seg' : `seg-${slice.memberId}`;

      return (
        <div
          key={key}
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
