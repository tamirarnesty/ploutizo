import { Suspense, lazy } from 'react';
import { BarChart3 } from 'lucide-react';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { ChartLazyBoundary } from '@/components/dashboard/ChartLazyBoundary';
import { DashboardOverviewMetricCard } from '@/components/dashboard/DashboardOverviewMetricCard';
import type { DashboardOverviewQueryState } from '@/components/dashboard/DashboardOverviewMetricCard';
import {
  spendTrendPriorRange,
  spendTrendSeriesLabels,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';

const SpendByCategoryChart = lazy(() =>
  import('@/components/dashboard/spend-by-category/SpendByCategoryChart').then(
    (module) => ({ default: module.SpendByCategoryChart })
  )
);

type SpendByCategoryCardProps = {
  query: DashboardOverviewQueryState;
  className?: string;
};

export const SpendByCategoryCard = ({
  query,
  className,
}: SpendByCategoryCardProps) => (
  <DashboardOverviewMetricCard
    title="Spend by category"
    label="spend by category"
    query={query}
    // The API drops only rows that net to exactly zero.
    isEmpty={(data) => data.categories.length === 0}
    emptyIcon={<BarChart3 />}
    className={className}
  >
    {(data) => (
      <ChartLazyBoundary label="spend by category chart">
        <Suspense
          fallback={
            <Skeleton className="h-full min-h-56 w-full motion-safe:animate-pulse" />
          }
        >
          <SpendByCategoryChart
            categories={data.categories}
            hasPriorSeries={spendTrendPriorRange(data.meta) !== null}
            seriesLabels={spendTrendSeriesLabels(data.meta)}
          />
        </Suspense>
      </ChartLazyBoundary>
    )}
  </DashboardOverviewMetricCard>
);
