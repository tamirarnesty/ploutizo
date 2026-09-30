import { BarChart3 } from 'lucide-react';
import { DashboardOverviewMetricCard } from '@/components/dashboard/DashboardOverviewMetricCard';
import type { DashboardOverviewQueryState } from '@/components/dashboard/DashboardOverviewMetricCard';
import { SpendByCategoryChart } from '@/components/dashboard/spend-by-category/SpendByCategoryChart';

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
    // The API returns only categories with positive spend.
    isEmpty={(data) => data.categories.length === 0}
    emptyIcon={<BarChart3 />}
    className={className}
  >
    {(data) => <SpendByCategoryChart data={data.categories} />}
  </DashboardOverviewMetricCard>
);
