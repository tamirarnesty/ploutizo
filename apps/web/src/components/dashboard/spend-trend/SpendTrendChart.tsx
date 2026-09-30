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
import type { DashboardOverviewGrain } from '@ploutizo/types';
import { amountDomain } from '@/components/dashboard/dashboardChartDomain';
import { formatWholeCurrency } from '@/components/dashboard/dashboardFormat';
import { formatTrendBucket } from '@/components/dashboard/spend-trend/spendTrendChartUtils';
import type {
  SpendTrendSegmentedPoint,
  SpendTrendSeriesLabels,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';

type SpendTrendChartProps = {
  data: SpendTrendSegmentedPoint[];
  grain: DashboardOverviewGrain;
  hasPriorSeries: boolean;
  seriesLabels: SpendTrendSeriesLabels;
};

export const SpendTrendChart = ({
  data,
  grain,
  hasPriorSeries,
  seriesLabels,
}: SpendTrendChartProps) => {
  const chartConfig = {
    current: { label: seriesLabels.current, color: 'var(--chart-1)' },
    prior: { label: seriesLabels.prior, color: 'var(--chart-2)' },
  } satisfies ChartConfig;
  const yDomain = amountDomain(
    data.flatMap((point) => [point.current, point.prior])
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-full min-h-56 w-full"
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
            formatTrendBucket(bucketStart, grain, 'axis')
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width="auto"
          domain={yDomain}
          tickFormatter={formatWholeCurrency}
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
                  ? formatTrendBucket(bucketStart, grain, 'tooltip')
                  : '';
              }}
              valueFormatter={formatWholeCurrency}
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
          <>
            <Line
              type="monotone"
              dataKey="prior"
              stroke="var(--color-prior)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </>
        ) : null}
      </RechartsLineChart>
    </ChartContainer>
  );
};
