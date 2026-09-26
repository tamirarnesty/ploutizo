import { format } from 'date-fns';
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
import { parseCalendarDate } from '@ploutizo/utils/dashboard-period';
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
    label: 'This month',
    color: 'var(--chart-1)',
  },
  prior: {
    label: 'Last month',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const formatAxisDay = (bucketStart: string): string =>
  format(parseCalendarDate(bucketStart), 'MMM d');

const formatTooltipDay = (bucketStart: string): string =>
  format(parseCalendarDate(bucketStart), 'MMM d, yyyy');

export const SpendTrendChart = ({ data }: SpendTrendChartProps) => {
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
          tickFormatter={formatAxisDay}
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
                  ? formatTooltipDay(bucketStart)
                  : '';
              }}
              valueFormatter={formatTrendCurrency}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="current"
          stroke="var(--color-current)"
          strokeWidth={2}
          dot={false}
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
