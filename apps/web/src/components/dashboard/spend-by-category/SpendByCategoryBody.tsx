import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import type { DashboardOverviewCategoryRow } from '@ploutizo/types';
import { SpendByCategoryChart } from '@/components/dashboard/spend-by-category/SpendByCategoryChart';
import {
  hasCategorySpend,
  toSpendByCategoryChartData,
} from '@/components/dashboard/spend-by-category/spendByCategoryChartUtils';

type SpendByCategoryBodyProps = {
  categories: DashboardOverviewCategoryRow[];
};

export const SpendByCategoryBody = ({
  categories,
}: SpendByCategoryBodyProps) => {
  const chartData = useMemo(
    () => toSpendByCategoryChartData(categories),
    [categories]
  );

  if (!hasCategorySpend(categories)) {
    return (
      <Empty className="border-0 py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle>No spend this period</EmptyTitle>
          <EmptyDescription>
            Expenses and refunds in this period will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <SpendByCategoryChart data={chartData} />;
};
