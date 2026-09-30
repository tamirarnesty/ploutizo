import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@ploutizo/ui/components/chart';
import type { ChartConfig } from '@ploutizo/ui/components/chart';
import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
import { COLOUR_BAR_FILL } from '@/components/colour/colour-token-classes';
import { formatWholeCurrency } from '@/components/dashboard/dashboardFormat';
import {
  formatCategoryChangeVsPrior,
  formatCategoryShare,
  toCategoryTooltipItems,
} from '@/components/dashboard/spend-by-category/spendByCategoryChartUtils';

type SpendByCategoryChartProps = {
  data: DashboardOverviewCategoryRow[];
};

const chartConfig = {
  amountCents: { label: 'Spend', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export const SpendByCategoryChart = ({ data }: SpendByCategoryChartProps) => (
  <ChartContainer
    config={chartConfig}
    className="aspect-auto h-full min-h-56 w-full"
  >
    <BarChart
      data={data}
      layout="vertical"
      margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
    >
      <CartesianGrid horizontal={false} />
      <XAxis
        type="number"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        tickFormatter={formatWholeCurrency}
      />
      <YAxis
        type="category"
        dataKey="name"
        width={96}
        tickLine={false}
        axisLine={false}
        tickMargin={8}
      />
      <ChartTooltip
        cursor={false}
        content={({ active, payload }) => {
          const row = payload[0]?.payload as
            | DashboardOverviewCategoryRow
            | undefined;
          if (!row) {
            return null;
          }
          const change = formatCategoryChangeVsPrior(
            row.amountCents,
            row.priorAmountCents
          );
          return (
            <ChartTooltipContent
              active={active}
              payload={toCategoryTooltipItems(row)}
              labelFormatter={() => (
                <>
                  <div>{row.name}</div>
                  <div className="font-normal text-muted-foreground">
                    {[
                      `${formatCategoryShare(row.shareOfPeriod)} of spend`,
                      change,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </>
              )}
              valueFormatter={formatWholeCurrency}
            />
          );
        }}
      />
      <Bar dataKey="amountCents" radius={4}>
        {data.map((row) => (
          <Cell
            key={row.categoryId ?? 'other'}
            className={COLOUR_BAR_FILL[row.colour]}
          />
        ))}
      </Bar>
    </BarChart>
  </ChartContainer>
);
