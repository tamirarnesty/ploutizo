import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@ploutizo/ui/components/chart';
import type { ChartConfig } from '@ploutizo/ui/components/chart';
import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
import {
  FADED_OPACITY,
  fadedColour,
} from '@/components/dashboard/dashboardChartColour';
import { amountDomain } from '@/components/dashboard/dashboardChartDomain';
import { formatWholeCurrency } from '@/components/dashboard/dashboardFormat';
import {
  NEUTRAL_SERIES_COLOUR,
  formatCategorySummary,
  spendByCategoryIndicatorColor,
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
  const priorHatchId = `${hatchId}-prior`;
  const data = toSpendByCategoryChartRows(categories, {
    current: `url(#${hatchId})`,
    prior: `url(#${priorHatchId})`,
  });
  const labelByKey = new Map(data.map((row) => [row.key, row.label]));
  // Rows net refunds against spend, so a bar can run left of zero; prior bars are only drawn with a prior window.
  const xDomain = amountDomain(
    data.flatMap((row) => [row.current, hasPriorSeries ? row.prior : null])
  );
  // Each row paints its own colour (<Cell>s), so the series colours only reach the legend, which explains the
  // treatment: solid for this period, faded for the prior one. Tooltip dots resolve the row's colours instead.
  const chartConfig = {
    current: { label: seriesLabels.current, color: NEUTRAL_SERIES_COLOUR },
    prior: {
      label: seriesLabels.prior,
      color: fadedColour(NEUTRAL_SERIES_COLOUR),
    },
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
          {/* Uncategorised's hatch, and the same hatch faded like every prior bar. */}
          {[
            { id: hatchId, opacity: 1 },
            { id: priorHatchId, opacity: FADED_OPACITY },
          ].map(({ id, opacity }) => (
            <pattern
              key={id}
              id={id}
              width={6}
              height={6}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <g opacity={opacity}>
                <rect
                  width={6}
                  height={6}
                  fill={NEUTRAL_SERIES_COLOUR}
                  fillOpacity={0.3}
                />
                <rect width={3} height={6} fill={NEUTRAL_SERIES_COLOUR} />
              </g>
            </pattern>
          ))}
        </defs>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={xDomain}
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
        {xDomain[0] < 0 ? (
          <ReferenceLine
            x={0}
            stroke="var(--border)"
            strokeOpacity={0.85}
            strokeWidth={1}
          />
        ) : null}
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
              indicatorColor={spendByCategoryIndicatorColor}
            />
          }
        />
        <Bar dataKey="current" fill="var(--color-current)" radius={4}>
          {data.map((row) => (
            <Cell key={row.key} fill={row.fill.current} />
          ))}
        </Bar>
        {hasPriorSeries ? (
          <>
            <Bar
              dataKey="prior"
              fill="var(--color-prior)"
              barSize={6}
              radius={3}
            >
              {data.map((row) => (
                <Cell key={row.key} fill={row.fill.prior} />
              ))}
            </Bar>
            <ChartLegend content={<ChartLegendContent />} />
          </>
        ) : null}
      </BarChart>
    </ChartContainer>
  );
};
