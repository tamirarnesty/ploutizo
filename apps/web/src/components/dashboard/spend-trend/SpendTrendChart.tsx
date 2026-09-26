import { format, isValid, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
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
  currentLabel?: string;
  priorLabel?: string;
  isAnimationActive?: boolean;
};

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

export const SpendTrendChart = ({
  data,
  currentLabel = 'Current period',
  priorLabel = 'Previous period',
  isAnimationActive = true,
}: SpendTrendChartProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const chartConfig = {
    current: {
      label: currentLabel,
      color: 'var(--chart-1)',
    },
    prior: {
      label: priorLabel,
      color: 'var(--chart-2)',
    },
  } satisfies ChartConfig;
  const hasPriorSeries = useMemo(() => spendTrendHasPriorSeries(data), [data]);
  const yDomain = useMemo(() => spendTrendYDomain(data), [data]);
  const showZeroReferenceLine = yDomain[0] < 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-56 min-h-48 w-full" aria-hidden />;
  }

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
              formatter={(value, name, item) => (
                <div className="flex w-full items-center gap-2">
                  <div
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1 text-muted-foreground">
                    {name === 'current' ? 'Current' : 'Previous'}
                  </span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {typeof value === 'number'
                      ? formatTrendCurrency(value)
                      : String(value)}
                  </span>
                </div>
              )}
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
          isAnimationActive={isAnimationActive}
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
            isAnimationActive={isAnimationActive}
          />
        ) : null}
        {hasPriorSeries ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
      </RechartsLineChart>
    </ChartContainer>
  );
};
