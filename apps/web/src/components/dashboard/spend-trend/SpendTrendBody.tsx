import { Suspense, lazy, useMemo } from 'react';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import type { GetDashboardOverviewResponse } from '@ploutizo/validators';
import { ChartLazyBoundary } from '@/components/dashboard/ChartLazyBoundary';
import {
  partialBucketEdges,
  segmentPartialBuckets,
  spendTrendGrain,
  spendTrendPriorRange,
  spendTrendSeriesLabels,
  toSpendTrendChartData,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';
import type { SpendTrendMode } from '@/lib/spend-trend-mode';

const SpendTrendChart = lazy(() =>
  import('@/components/dashboard/spend-trend/SpendTrendChart').then(
    (module) => ({ default: module.SpendTrendChart })
  )
);

type SpendTrendBodyProps = {
  overview: GetDashboardOverviewResponse;
  mode: SpendTrendMode;
  /** Decides whether All's last bucket is still in progress. */
  today: string;
};

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

  return (
    <ChartLazyBoundary label="spend trend chart">
      <Suspense
        fallback={
          <Skeleton className="h-full min-h-56 w-full motion-safe:animate-pulse" />
        }
      >
        <SpendTrendChart
          data={chartData}
          grain={spendTrendGrain(overview.meta)}
          hasPriorSeries={spendTrendPriorRange(overview.meta) !== null}
          seriesLabels={spendTrendSeriesLabels(overview.meta)}
        />
      </Suspense>
    </ChartLazyBoundary>
  );
};
