import { BarChart3 } from 'lucide-react';
import { DashboardOverviewMetricCard } from '@/components/dashboard/DashboardOverviewMetricCard';
import type { DashboardOverviewQueryState } from '@/components/dashboard/DashboardOverviewMetricCard';
import { SpendByCategoryChart } from '@/components/dashboard/spend-by-category/SpendByCategoryChart';
import {
  spendTrendPriorRange,
  spendTrendSeriesLabels,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';

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
      <SpendByCategoryChart
        categories={data.categories}
        hasPriorSeries={spendTrendPriorRange(data.meta) !== null}
        seriesLabels={spendTrendSeriesLabels(data.meta)}
      />
    )}
  </DashboardOverviewMetricCard>
);
