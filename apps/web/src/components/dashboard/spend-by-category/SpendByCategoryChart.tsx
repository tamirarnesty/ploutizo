import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@ploutizo/ui/components/chart';
import type { ChartConfig } from '@ploutizo/ui/components/chart';
import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
import { formatWholeCurrency } from '@/components/dashboard/dashboardFormat';
import {
  formatCategorySummary,
  toSpendByCategoryChartRows,
} from '@/components/dashboard/spend-by-category/spendByCategoryChartUtils';
import type { SpendByCategoryChartRow } from '@/components/dashboard/spend-by-category/spendByCategoryChartUtils';
import type { SpendTrendSeriesLabels } from '@/components/dashboard/spend-trend/spendTrendChartUtils';

type SpendByCategoryChartProps = {
  categories: DashboardOverviewCategoryRow[];
  hasPriorSeries: boolean;
  seriesLabels: SpendTrendSeriesLabels;
};

export const SpendByCategoryChart = ({
  categories,
  hasPriorSeries,
  seriesLabels,
}: SpendByCategoryChartProps) => {
  // Unique per chart so two instances' patterns never collide; colons stripped as in chart.tsx, for `url(#…)`.
  const hatchId = `uncategorised-hatch-${useId().replace(/:/g, '')}`;
  const data = toSpendByCategoryChartRows(categories, `url(#${hatchId})`);
  const labelByKey = new Map(data.map((row) => [row.key, row.label]));
  // Same series colours as the spend trend. Tooltip dots and legend swatches read each <Bar>'s `fill`: Recharts
  // never passes <Cell> fills to the tooltip, so this period's dot is the series colour, not the category's.
  const chartConfig = {
    current: { label: seriesLabels.current, color: 'var(--chart-1)' },
    prior: { label: seriesLabels.prior, color: 'var(--chart-2)' },
  } satisfies ChartConfig;

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-full min-h-56 w-full"
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
      >
        <defs>
          <pattern
            id={hatchId}
            width={6}
            height={6}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect
              width={6}
              height={6}
              fill="var(--muted-foreground)"
              fillOpacity={0.3}
            />
            <rect width={3} height={6} fill="var(--muted-foreground)" />
          </pattern>
        </defs>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatWholeCurrency}
        />
        {/* Keyed by id, not label, so a category named like a synthetic row still gets its own bar and tooltip. */}
        <YAxis
          type="category"
          dataKey="key"
          width={96}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(key: string) => labelByKey.get(key) ?? key}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const row = payload[0]?.payload as
                  | SpendByCategoryChartRow
                  | undefined;
                return row ? (
                  <>
                    <div>{row.label}</div>
                    <div className="font-normal text-muted-foreground">
                      {formatCategorySummary(row)}
                    </div>
                  </>
                ) : null;
              }}
              valueFormatter={formatWholeCurrency}
            />
          }
        />
        <Bar dataKey="current" fill="var(--color-current)" radius={4}>
          {data.map((row) => (
            <Cell key={row.key} fill={row.barFill} />
          ))}
        </Bar>
        {hasPriorSeries ? (
          <>
            <Bar
              dataKey="prior"
              fill="var(--color-prior)"
              fillOpacity={0.6}
              barSize={6}
              radius={3}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </>
        ) : null}
      </BarChart>
    </ChartContainer>
  );
};
