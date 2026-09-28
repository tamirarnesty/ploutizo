import { LineChart } from 'lucide-react';
import { useMemo } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import type {
  DashboardOverviewTrendPoint,
  GetDashboardOverviewResponse,
} from '@ploutizo/types';
import { SpendTrendChart } from '@/components/dashboard/spend-trend/SpendTrendChart';
import {
  partialMonthEdges,
  segmentPartialMonths,
  spendTrendSeriesLabels,
  toSpendTrendChartData,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';

type SpendTrendBodyProps = {
  overview: GetDashboardOverviewResponse;
  /** Decides whether All's last month is still in progress. */
  today: string;
};

const hasSpendActivity = (trend: DashboardOverviewTrendPoint[]): boolean =>
  trend.some(
    (point) => point.amountCents !== 0 || (point.priorAmountCents ?? 0) !== 0
  );

export const SpendTrendBody = ({ overview, today }: SpendTrendBodyProps) => {
  const chartData = useMemo(
    () =>
      segmentPartialMonths(
        toSpendTrendChartData(overview),
        partialMonthEdges(overview.meta, today)
      ),
    [overview, today]
  );

  if (!hasSpendActivity(overview.trend)) {
    return (
      <Empty className="border-0 py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LineChart />
          </EmptyMedia>
          <EmptyTitle>No spend in this period</EmptyTitle>
          <EmptyDescription>
            Expenses and refunds in this period will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <SpendTrendChart
      data={chartData}
      bucket={overview.meta.bucket}
      hasPriorSeries={overview.meta.prior !== null}
      seriesLabels={spendTrendSeriesLabels(overview.meta)}
    />
  );
};
