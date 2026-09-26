import { format, isValid, parseISO } from 'date-fns';
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
import {
  formatTrendCurrency,
  spendTrendHasPriorSeries,
  spendTrendYDomain,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';
import type { SpendTrendChartPoint } from '@/components/dashboard/spend-trend/spendTrendChartUtils';

type SpendTrendChartProps = {
  data: SpendTrendChartPoint[];
};

const chartConfig = {
  current: {
    label: 'This',
    color: 'var(--chart-1)',
  },
  prior: {
    label: 'Prior',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const formatBucketLabel = (bucketStart: string): string => {
  const [, month, day] = bucketStart.split('-');
  return `${month}/${day}`;
};

const formatTooltipBucketLabel = (bucketStart: string): string => {
  const parsed = parseISO(bucketStart);
  if (isValid(parsed)) {
    return format(parsed, 'MMM d, yyyy');
  }
  return formatBucketLabel(bucketStart);
};

export const SpendTrendChart = ({ data }: SpendTrendChartProps) => {
  const hasPriorSeries = useMemo(() => spendTrendHasPriorSeries(data), [data]);
  const yDomain = useMemo(() => spendTrendYDomain(data), [data]);
  const showZeroReferenceLine = yDomain[0] < 0;

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-56 min-h-48 w-full"
    >
      <RechartsLineChart
        data={data}
        margin={{
          left: 8,
          right: 8,
          top: 8,
          bottom: hasPriorSeries ? 8 : 0,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucketStart"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatBucketLabel}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={56}
          domain={yDomain}
          tickFormatter={(value: number) => formatTrendCurrency(value)}
        />
        {showZeroReferenceLine ? (
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
                  ? formatTooltipBucketLabel(bucketStart)
                  : '';
              }}
              valueFormatter={(cents) => formatTrendCurrency(cents)}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="current"
          name="current"
          stroke="var(--color-current)"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        {hasPriorSeries ? (
          <Line
            type="monotone"
            dataKey="prior"
            name="prior"
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
