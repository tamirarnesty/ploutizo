import { format, isValid, parseISO } from 'date-fns';
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@ploutizo/ui/components/chart';
import type { ChartConfig } from '@ploutizo/ui/components/chart';
import { formatTrendCurrency } from '@/components/dashboard/spend-trend/SpendTrendBody';

type SpendTrendChartPoint = {
  bucketStart: string;
  current: number;
  prior: number | null;
};

type SpendTrendChartProps = {
  data: SpendTrendChartPoint[];
};

const chartConfig = {
  current: {
    label: 'This period',
    color: 'var(--chart-1)',
  },
  prior: {
    label: 'Prior period',
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

const seriesLabelForDataKey = (dataKey: string): string => {
  if (dataKey === 'current') {
    return chartConfig.current.label;
  }
  if (dataKey === 'prior') {
    return chartConfig.prior.label;
  }
  return dataKey;
};

export const SpendTrendChart = ({ data }: SpendTrendChartProps) => {
  const yDomain = useMemo(() => {
    const values = data.flatMap((point) =>
      [point.current, point.prior ?? 0].filter((value) =>
        Number.isFinite(value)
      )
    );
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    if (min === max) {
      return [min - 1, max + 1] as [number, number];
    }
    return [min, max] as [number, number];
  }, [data]);

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-56 min-h-48 w-full"
    >
      <RechartsLineChart
        data={data}
        margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
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
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const bucketStart = payload[0]?.payload?.bucketStart;
                return typeof bucketStart === 'string'
                  ? formatTooltipBucketLabel(bucketStart)
                  : '';
              }}
              formatter={(value, _name, item) => {
                const dataKey = String(item.dataKey ?? item.name ?? '');
                return (
                  <div className="flex w-full flex-1 items-center justify-between gap-4 leading-none">
                    <span className="text-muted-foreground">
                      {seriesLabelForDataKey(dataKey)}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatTrendCurrency(Number(value))}
                    </span>
                  </div>
                );
              }}
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
        <Line
          type="monotone"
          dataKey="prior"
          name="prior"
          stroke="var(--color-prior)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          connectNulls
        />
      </RechartsLineChart>
    </ChartContainer>
  );
};
