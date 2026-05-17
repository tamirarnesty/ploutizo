import { Fragment, useMemo } from 'react';
import { Separator } from '@ploutizo/ui/components/separator';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { SettlementAccountRow } from '@ploutizo/types';
import {
  MEMBER_CHART_DOT_CLASSES,
  buildMemberChartVisualSlots,
  getMemberDisplayFirstName,
} from '@/components/dashboard/card-balances/cardBalancesMemberDisplay';
import {
  buildLegendTopMembers,
  flattenMemberOutstandingTotals,
} from '@/components/dashboard/card-balances/cardBalancesLegend';
import { formatCurrency } from '@/lib/formatCurrency';

export type CardBalancesHeaderLegendProps = {
  accounts: readonly SettlementAccountRow[];
};

export const CardBalancesHeaderLegend = ({
  accounts,
}: CardBalancesHeaderLegendProps) => {
  const { legendLines, chartSlots, topMembers, overflowCount } = useMemo(() => {
    const lines = flattenMemberOutstandingTotals(accounts);
    return {
      legendLines: lines,
      chartSlots: buildMemberChartVisualSlots(lines.map((l) => l.memberId))
        .dotClasses,
      ...buildLegendTopMembers(lines),
    };
  }, [accounts]);

  if (legendLines.length === 0) {
    return null;
  }

  return (
    <div
      className="flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1"
      aria-label="Top member balances overview"
    >
      {topMembers.map((m, idx) => {
        const fillClass =
          chartSlots.get(m.memberId) ?? MEMBER_CHART_DOT_CLASSES[0];
        const firstName = getMemberDisplayFirstName(m.memberName);
        const absCents = Math.abs(m.balanceCents);

        return (
          <Fragment key={m.memberId}>
            {idx > 0 ? (
              <Separator orientation="vertical" className="h-3" />
            ) : null}
            <div className="inline-flex max-w-[14rem] min-w-0 items-center gap-[5px]">
              <span
                aria-hidden
                className={cn('size-[7px] shrink-0 rounded-full', fillClass)}
              />
              <Text
                as="span"
                variant="caption"
                className="min-w-0 truncate leading-tight font-normal text-muted-foreground"
              >
                {firstName}
              </Text>
              <Text
                as="span"
                variant="caption"
                className="shrink-0 leading-tight text-muted-foreground tabular-nums"
              >
                {formatCurrency(absCents)}
              </Text>
            </div>
          </Fragment>
        );
      })}
      {overflowCount > 0 ? (
        <>
          <Separator orientation="vertical" className="h-3" />
          <Text variant="caption" className="shrink-0 text-muted-foreground">
            +{overflowCount} more
          </Text>
        </>
      ) : null}
    </div>
  );
};
