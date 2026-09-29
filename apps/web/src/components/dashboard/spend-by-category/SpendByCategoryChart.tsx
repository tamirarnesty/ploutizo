import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@ploutizo/ui/components/chart';
import type { ChartConfig } from '@ploutizo/ui/components/chart';
import { barFillClassFromRaw } from '@/components/colour/colour-token-classes';
import {
  formatCategoryAmount,
  formatCategoryChangeVsPrior,
  formatCategoryShare,
} from '@/components/dashboard/spend-by-category/spendByCategoryChartUtils';
import type { SpendByCategoryChartRow } from '@/components/dashboard/spend-by-category/spendByCategoryChartUtils';

type SpendByCategoryChartProps = {
  data: SpendByCategoryChartRow[];
};

const chartConfig = {
  amountCents: { label: 'Spend', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export const SpendByCategoryChart = ({ data }: SpendByCategoryChartProps) => (
  <ChartContainer
    config={chartConfig}
    className="aspect-auto h-56 min-h-48 w-full"
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
        tickFormatter={formatCategoryAmount}
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
        content={
          <ChartTooltipContent
            hideIndicator
            labelFormatter={(_label, payload) => {
              const row = payload[0].payload as SpendByCategoryChartRow;
              return row.name;
            }}
            formatter={(_value, _name, item) => {
              const row = item.payload as SpendByCategoryChartRow;
              const change = formatCategoryChangeVsPrior(
                row.amountCents,
                row.priorAmountCents
              );
              return (
                <div className="grid w-full gap-0.5 text-muted-foreground">
                  <span>{formatCategoryAmount(row.amountCents)}</span>
                  <span>{formatCategoryShare(row.shareOfPeriod)} of spend</span>
                  {change ? <span>{change}</span> : null}
                </div>
              );
            }}
          />
        }
      />
      <Bar dataKey="amountCents" radius={4}>
        {data.map((row) => (
          <Cell
            key={row.rowKey}
            className={
              barFillClassFromRaw(row.colour) ?? 'fill-muted-foreground'
            }
          />
        ))}
      </Bar>
    </BarChart>
  </ChartContainer>
);
