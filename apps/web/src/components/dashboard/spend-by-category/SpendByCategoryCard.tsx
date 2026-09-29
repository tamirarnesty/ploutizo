import { DashboardOverviewMetricCard } from '@/components/dashboard/DashboardOverviewMetricCard';
import type { DashboardOverviewQuery } from '@/components/dashboard/DashboardOverviewMetricCard';
import { SpendByCategoryBody } from '@/components/dashboard/spend-by-category/SpendByCategoryBody';

type SpendByCategoryCardProps = {
  query: DashboardOverviewQuery;
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
    className={className}
  >
    {(data) => <SpendByCategoryBody categories={data.categories} />}
  </DashboardOverviewMetricCard>
);
