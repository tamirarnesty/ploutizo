import { Badge } from '@ploutizo/ui/components/badge';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { AttributionSlice } from '@/components/dashboard/card-balances/CardBalancesBreakdownCell';
import type { MemberChartSlotClassMap } from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';
import {
  MEMBER_CHART_DOT_CLASSES,
  SHARED_CHART_DOT_CLASS,
} from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';
import { getFirstNameFromDisplayName } from '@/lib/memberDisplayName';

export type CardBalancesBreakdownMemberChipsProps = {
  slices: readonly AttributionSlice[];
  memberChartClassMap: MemberChartSlotClassMap;
};

export const CardBalancesBreakdownMemberChips = ({
  slices,
  memberChartClassMap,
}: CardBalancesBreakdownMemberChipsProps) => (
  <div className="flex flex-wrap gap-1.5">
    {slices.map((slice) => {
      const label =
        slice.kind === 'shared'
          ? 'Shared'
          : getFirstNameFromDisplayName(slice.name);
      const fillClass =
        slice.kind === 'shared'
          ? SHARED_CHART_DOT_CLASS
          : (memberChartClassMap.get(slice.memberId) ??
            MEMBER_CHART_DOT_CLASSES[0]);
      const key =
        slice.kind === 'shared' ? 'shared-chip' : `chip-${slice.memberId}`;

      return (
        <Badge
          key={key}
          variant="outline"
          className={cn(
            'h-auto max-w-full min-w-0 gap-1.5 border-border bg-muted py-0.5 pr-2 pl-2 font-normal hover:bg-accent'
          )}
        >
          <span
            aria-hidden
            className={cn('size-1.5 shrink-0 rounded-full', fillClass)}
          />
          <Text
            as="span"
            variant="caption"
            className="min-w-0 truncate leading-tight"
          >
            {label}
          </Text>
          <SignedBalanceText
            cents={slice.balanceCents}
            variant="caption"
            className="shrink-0 leading-tight font-normal"
          />
        </Badge>
      );
    })}
  </div>
);
