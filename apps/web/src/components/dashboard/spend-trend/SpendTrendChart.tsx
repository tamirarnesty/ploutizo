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

const seriesLabelForDataKey = (dataKey: string): string => {
  if (dataKey === 'current') {
    return chartConfig.current.label;
  }
  if (dataKey === 'prior') {
    return chartConfig.prior.label;
  }
  return dataKey;
};

const SpendTrendCompactLegend = () => (
  <div
    className="flex items-center justify-center gap-2 pt-1 text-[11px] leading-none text-muted-foreground"
    aria-label="Chart legend"
  >
    <span className="flex items-center gap-1.5">
      <span
        className="h-0.5 w-3 shrink-0 rounded-full bg-(--color-current)"
        aria-hidden
      />
      {chartConfig.current.label}
    </span>
    <span aria-hidden>·</span>
    <span className="flex items-center gap-1.5">
      <span
        className="h-0 w-3 shrink-0 border-t-[1.5px] border-dashed border-(--color-prior)"
        aria-hidden
      />
      {chartConfig.prior.label}
    </span>
  </div>
);

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
              formatter={(value, _name, item) => {
                const dataKey = String(item.dataKey ?? item.name ?? '');
                if (
                  dataKey === 'prior' &&
                  item.payload &&
                  typeof item.payload === 'object' &&
                  'prior' in item.payload &&
                  item.payload.prior === null
                ) {
                  return null;
                }
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
        {hasPriorSeries ? (
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
        ) : null}
      </RechartsLineChart>
      {hasPriorSeries ? <SpendTrendCompactLegend /> : null}
    </ChartContainer>
  );
};
