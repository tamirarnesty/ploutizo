import { endOfMonth, format } from 'date-fns';
import { formatCurrency } from '@ploutizo/utils/currency';
import {
  parseCalendarDate,
  toCalendarDate,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardPeriodSelection,
  DashboardPeriodShortcut,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardOverviewBucket,
  DashboardOverviewTrendPoint,
  GetDashboardOverviewResponse,
} from '@ploutizo/types';

export type SpendTrendChartPoint = {
  bucketStart: string;
  current: number;
  prior: number | null;
};

/** `current` split into the strokes the chart draws: solid for whole buckets, dashed into and across partial ones. */
export type SpendTrendSegmentedPoint = SpendTrendChartPoint & {
  complete: number | null;
  partial: number | null;
};

export type PartialMonthEdges = { first: boolean; last: boolean };

const NO_PARTIAL_EDGES: PartialMonthEdges = { first: false, last: false };

/**
 * Month buckets the chart only partly covers: the first when the range starts mid-month, and the last when that
 * month is not over by `through` (the date the chart runs to — today for All, whose range ends at the latest spend).
 */
export const partialMonthEdges = (
  meta: GetDashboardOverviewResponse['meta'],
  through: string
): PartialMonthEdges => {
  if (meta.bucket !== 'month' || !meta.range) {
    return NO_PARTIAL_EDGES;
  }
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

// Only these periods resolve with a prior window; every other period charts spend on its own.
const COMPARISON_SERIES_LABELS: Partial<
  Record<DashboardPeriodShortcut, SpendTrendSeriesLabels>
> = {
  mtd: { current: 'This month', prior: 'Last month' },
  '30d': { current: 'Last 30 days', prior: 'Previous 30 days' },
  ytd: { current: 'This year', prior: 'Last year' },
};

export const spendTrendSeriesLabels = (
  selection: DashboardPeriodSelection
): SpendTrendSeriesLabels =>
  (selection.kind === 'shortcut'
    ? COMPARISON_SERIES_LABELS[selection.shortcut]
    : undefined) ?? STANDALONE_SERIES_LABELS;

/** Says what the y-axis measures, since comparisons chart running totals and other periods chart per-bucket spend. */
export const spendTrendCaption = (
  labels: SpendTrendSeriesLabels,
  bucket: DashboardOverviewBucket
): string =>
  labels.prior
    ? `Running total vs ${labels.prior.toLowerCase()}`
    : `Spend per ${bucket}`;

/**
 * A comparison charts running totals, so each point reads "spent so far" against the prior window.
 * Without one, each point is that bucket's own spend.
 */
export const toSpendTrendChartData = (
  trend: DashboardOverviewTrendPoint[]
): SpendTrendChartPoint[] => {
  if (trend.every((point) => point.priorAmountCents === null)) {
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

export const spendTrendHasPriorSeries = (
  data: SpendTrendChartPoint[]
): boolean => data.some((point) => point.prior !== null);

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
