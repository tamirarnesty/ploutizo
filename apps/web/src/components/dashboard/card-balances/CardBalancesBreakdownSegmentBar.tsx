import { cn } from '@ploutizo/ui/lib/utils';
import type { CardBalanceAttributionChip } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';
import type { MemberChartSegmentSlotClassMap } from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';
import {
  MEMBER_CHART_SEGMENT_CLASSES,
  SHARED_CHART_SEGMENT_CLASS,
} from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';

export type CardBalancesBreakdownSegmentBarProps = {
  chips: readonly CardBalanceAttributionChip[];
  memberSegmentClassMap: MemberChartSegmentSlotClassMap;
};

export const CardBalancesBreakdownSegmentBar = ({
  chips,
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
    {chips.map((chip) => {
      const weight = Math.max(Math.abs(chip.balanceCents), 0);
      const fillClass =
        chip.kind === 'shared'
          ? SHARED_CHART_SEGMENT_CLASS
          : (memberSegmentClassMap.get(chip.memberId) ??
            MEMBER_CHART_SEGMENT_CLASSES[0]);
      const key =
        chip.kind === 'shared' ? 'shared-seg' : `seg-${chip.memberId}`;

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
