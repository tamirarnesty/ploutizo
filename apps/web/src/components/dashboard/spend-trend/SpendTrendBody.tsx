import { useMemo } from 'react';
import type { GetDashboardOverviewResponse } from '@ploutizo/validators';
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
    <SpendTrendChart
      data={chartData}
      grain={spendTrendGrain(overview.meta)}
      hasPriorSeries={spendTrendPriorRange(overview.meta) !== null}
      seriesLabels={spendTrendSeriesLabels(overview.meta)}
    />
  );
};
