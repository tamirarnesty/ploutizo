import { endOfMonth, format } from 'date-fns';
import { formatCurrency } from '@ploutizo/utils/currency';
import {
  parseCalendarDate,
  toCalendarDate,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardOverviewBucket,
  DashboardOverviewComparison,
  DashboardOverviewMeta,
  GetDashboardOverviewResponse,
} from '@ploutizo/types';

type SpendTrendChartPoint = {
  bucketStart: string;
  current: number;
  prior: number | null;
};

/** `current` split into the strokes the chart draws: solid for whole buckets, dashed into and across partial ones. */
export type SpendTrendSegmentedPoint = SpendTrendChartPoint & {
  complete: number | null;
  partial: number | null;
};

type PartialMonthEdges = { first: boolean; last: boolean };

/**
 * Month buckets the chart only partly covers: the first when the range starts mid-month, and the last when that
 * month is not over by the date the chart runs to — the range end, or `today` for All, whose range ends at the
 * latest spend.
 */
export const partialMonthEdges = (
  meta: DashboardOverviewMeta,
  today: string
): PartialMonthEdges => {
  if (meta.bucket !== 'month' || !meta.range) {
    return { first: false, last: false };
  }
  const through = meta.kind === 'all' ? today : meta.range.to;
  const lastMonthEnd = toCalendarDate(
    endOfMonth(parseCalendarDate(meta.range.to))
  );
  return {
    first: !meta.range.from.endsWith('-01'),
    last: through < lastMonthEnd,
  };
};

export const segmentPartialMonths = (
  data: SpendTrendChartPoint[],
  edges: PartialMonthEdges
): SpendTrendSegmentedPoint[] => {
  const isPartial = (index: number) =>
    (edges.first && index === 0) || (edges.last && index === data.length - 1);
  return data.map((point, index) => ({
    ...point,
    complete: isPartial(index) ? null : point.current,
    // Includes the neighbouring whole bucket so the dashed stroke joins the solid one.
    partial:
      isPartial(index) || isPartial(index - 1) || isPartial(index + 1)
        ? point.current
        : null,
  }));
};

export type SpendTrendSeriesLabels = {
  current: string;
  prior: string;
};

const STANDALONE_SERIES_LABELS: SpendTrendSeriesLabels = {
  current: 'Spend',
  prior: '',
};

const COMPARISON_SERIES_LABELS: Record<
  DashboardOverviewComparison,
  SpendTrendSeriesLabels
> = {
  'previous-month': { current: 'This month', prior: 'Last month' },
  'previous-30-days': { current: 'Last 30 days', prior: 'Previous 30 days' },
  'previous-year': { current: 'This year', prior: 'Last year' },
};

/** Named from the response, so labels always match the data on screen, including while a new period loads. */
export const spendTrendSeriesLabels = (
  meta: DashboardOverviewMeta
): SpendTrendSeriesLabels =>
  meta.prior
    ? COMPARISON_SERIES_LABELS[meta.prior.comparison]
    : STANDALONE_SERIES_LABELS;

/** Says what the y-axis measures, since comparisons chart running totals and other periods chart per-bucket spend. */
export const spendTrendCaption = (meta: DashboardOverviewMeta): string =>
  meta.prior
    ? `Running total vs ${COMPARISON_SERIES_LABELS[meta.prior.comparison].prior.toLowerCase()}`
    : `Spend per ${meta.bucket}`;

/**
 * A comparison charts running totals, so each point reads "spent so far" against the prior window.
 * Without one, each point is that bucket's own spend.
 */
export const toSpendTrendChartData = ({
  meta,
  trend,
}: GetDashboardOverviewResponse): SpendTrendChartPoint[] => {
  if (meta.prior === null) {
    return trend.map((point) => ({
      bucketStart: point.bucketStart,
      current: point.amountCents,
      prior: null,
    }));
  }

  let current = 0;
  let prior = 0;
  return trend.map((point) => {
    current += point.amountCents;
    if (point.priorAmountCents !== null) {
      prior += point.priorAmountCents;
    }
    return {
      bucketStart: point.bucketStart,
      current,
      prior: point.priorAmountCents === null ? null : prior,
    };
  });
};

export const spendTrendYDomain = (
  data: SpendTrendChartPoint[]
): [number, number] => {
  const values = data.flatMap((point) =>
    [point.current, point.prior ?? 0].filter((value) => Number.isFinite(value))
  );
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  if (min === max) {
    return [min - 1, max + 1];
  }
  return [min, max];
};

export const formatTrendCurrency = (amountCents: number): string =>
  formatCurrency(amountCents, undefined, undefined, {
    maximumFractionDigits: 0,
  });

const bucketFormats = {
  day: { axis: 'MMM d', tooltip: 'MMM d, yyyy' },
  month: { axis: 'MMM yyyy', tooltip: 'MMMM yyyy' },
} satisfies Record<DashboardOverviewBucket, { axis: string; tooltip: string }>;

export const formatTrendBucket = (
  bucketStart: string,
  bucket: DashboardOverviewBucket,
  target: 'axis' | 'tooltip'
): string =>
  format(parseCalendarDate(bucketStart), bucketFormats[bucket][target]);
