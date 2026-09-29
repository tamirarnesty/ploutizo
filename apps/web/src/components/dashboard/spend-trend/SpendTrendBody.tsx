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
} from '@ploutizo/validators';
import { SpendTrendChart } from '@/components/dashboard/spend-trend/SpendTrendChart';
import {
  partialBucketEdges,
  segmentPartialBuckets,
  spendTrendGrain,
  spendTrendPriorRange,
  spendTrendSeriesLabels,
  toSpendTrendChartData,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';
import type { SpendTrendMode } from '@/lib/spend-trend-mode';

type SpendTrendBodyProps = {
  overview: GetDashboardOverviewResponse;
  mode: SpendTrendMode;
  /** Decides whether All's last bucket is still in progress. */
  today: string;
};

const hasSpendActivity = (trend: DashboardOverviewTrendPoint[]): boolean =>
  trend.some(
    (point) => point.amountCents !== 0 || (point.priorAmountCents ?? 0) !== 0
  );

export const SpendTrendBody = ({
  overview,
  mode,
  today,
}: SpendTrendBodyProps) => {
  const chartData = useMemo(
    () =>
      segmentPartialBuckets(
        toSpendTrendChartData(overview, mode),
        partialBucketEdges(overview.meta, today)
      ),
    [overview, mode, today]
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
      grain={spendTrendGrain(overview.meta)}
      hasPriorSeries={spendTrendPriorRange(overview.meta) !== null}
      seriesLabels={spendTrendSeriesLabels(overview.meta)}
    />
  );
};
