import { LineChart } from 'lucide-react';
import { useMemo } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import type { DashboardOverviewTrendPoint } from '@ploutizo/types';
import { SpendTrendChart } from '@/components/dashboard/spend-trend/SpendTrendChart';

type SpendTrendBodyProps = {
  trend: DashboardOverviewTrendPoint[];
};

const hasSpendActivity = (trend: DashboardOverviewTrendPoint[]): boolean =>
  trend.some(
    (point) => point.amountCents !== 0 || (point.priorAmountCents ?? 0) !== 0
  );

export const SpendTrendBody = ({ trend }: SpendTrendBodyProps) => {
  const chartData = useMemo(
    () =>
      trend.map((point) => ({
        bucketStart: point.bucketStart,
        current: point.amountCents,
        prior: point.priorAmountCents,
      })),
    [trend]
  );

  if (!hasSpendActivity(trend)) {
    return (
      <Empty className="border-0 py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LineChart />
          </EmptyMedia>
          <EmptyTitle>No spend this month</EmptyTitle>
          <EmptyDescription>
            Expenses and refunds from this month will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <SpendTrendChart data={chartData} />;
};
