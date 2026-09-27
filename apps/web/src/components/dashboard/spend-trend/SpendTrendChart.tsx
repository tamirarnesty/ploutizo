import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
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
import type { DashboardOverviewBucket } from '@ploutizo/types';
import {
  formatTrendBucket,
  formatTrendCurrency,
  spendTrendHasPriorSeries,
  spendTrendYDomain,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';
import type {
  SpendTrendSegmentedPoint,
  SpendTrendSeriesLabels,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';

type SpendTrendChartProps = {
  data: SpendTrendSegmentedPoint[];
  bucket: DashboardOverviewBucket;
  seriesLabels: SpendTrendSeriesLabels;
};

const chartConfigFor = (labels: SpendTrendSeriesLabels) =>
  ({
    current: { label: labels.current, color: 'var(--chart-1)' },
    prior: { label: labels.prior, color: 'var(--chart-2)' },
  }) satisfies ChartConfig;

export const SpendTrendChart = ({
  data,
  bucket,
  seriesLabels,
}: SpendTrendChartProps) => {
  const chartConfig = useMemo(
    () => chartConfigFor(seriesLabels),
    [seriesLabels]
  );
  const hasPriorSeries = useMemo(() => spendTrendHasPriorSeries(data), [data]);
  const yDomain = useMemo(() => spendTrendYDomain(data), [data]);

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-56 min-h-48 w-full"
    >
      <RechartsLineChart
        data={data}
        margin={{ left: 8, right: 8, top: 8, bottom: hasPriorSeries ? 8 : 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucketStart"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(bucketStart: string) =>
            formatTrendBucket(bucketStart, bucket, 'axis')
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={56}
          domain={yDomain}
          tickFormatter={formatTrendCurrency}
        />
        {yDomain[0] < 0 ? (
          <ReferenceLine
            y={0}
            stroke="var(--border)"
            strokeOpacity={0.85}
            strokeWidth={1}
          />
        ) : null}
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const bucketStart = payload[0]?.payload?.bucketStart;
                return typeof bucketStart === 'string'
                  ? formatTrendBucket(bucketStart, bucket, 'tooltip')
                  : '';
              }}
              valueFormatter={formatTrendCurrency}
            />
          }
        />
        {/* Carries the tooltip and active dot; the two strokes below draw the visible line. */}
        <Line
          type="monotone"
          dataKey="current"
          stroke="var(--color-current)"
          strokeOpacity={0}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="complete"
          stroke="var(--color-current)"
          strokeWidth={2}
          dot={false}
          activeDot={false}
          tooltipType="none"
          legendType="none"
        />
        <Line
          type="monotone"
          dataKey="partial"
          stroke="var(--color-current)"
          strokeWidth={2}
          strokeDasharray="4 4"
          strokeOpacity={0.6}
          dot={false}
          activeDot={false}
          tooltipType="none"
          legendType="none"
        />
        {hasPriorSeries ? (
          <Line
            type="monotone"
            dataKey="prior"
            stroke="var(--color-prior)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
          />
        ) : null}
        {hasPriorSeries ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
      </RechartsLineChart>
    </ChartContainer>
  );
};
