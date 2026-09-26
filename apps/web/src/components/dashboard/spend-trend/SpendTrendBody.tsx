import { LineChart } from 'lucide-react';
import { useMemo } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import { Text } from '@ploutizo/ui/components/text';
import type { DashboardOverviewTrendPoint } from '@ploutizo/types';
import { SpendTrendChart } from '@/components/dashboard/spend-trend/SpendTrendChart';

type SpendTrendBodyProps = {
  trend: DashboardOverviewTrendPoint[] | undefined;
};

const hasSpendActivity = (trend: DashboardOverviewTrendPoint[]): boolean =>
  trend.some(
    (point) => point.amountCents !== 0 || (point.priorAmountCents ?? 0) !== 0
  );

export const SpendTrendBody = ({ trend }: SpendTrendBodyProps) => {
  const chartData = useMemo(
    () =>
      (trend ?? []).map((point) => ({
        bucketStart: point.bucketStart,
        current: point.amountCents,
        prior: point.priorAmountCents,
      })),
    [trend]
  );

  if (!trend || !hasSpendActivity(trend)) {
    return (
      <Empty className="border-0 py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LineChart />
          </EmptyMedia>
          <EmptyTitle>No spend in this period</EmptyTitle>
          <EmptyDescription>
            Expenses and refunds in the selected range will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <SpendTrendChart data={chartData} />;
};

export const SpendTrendError = () => (
  <Text
    variant="caption"
    role="alert"
    className="px-3.5 py-6 text-muted-foreground"
  >
    Couldn’t load spend trend.
  </Text>
);

export { formatTrendCurrency } from '@/components/dashboard/spend-trend/spendTrendChartUtils';
