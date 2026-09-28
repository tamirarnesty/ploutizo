import { format } from 'date-fns';
import { formatCurrency } from '@ploutizo/utils/currency';
import {
  bucketBounds,
  formatCalendarDateRange,
  parseCalendarDate,
} from '@ploutizo/utils/dashboard-period';
import type {
  CalendarDateRange,
  DashboardOverviewGrain,
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

type PartialBucketEdges = { first: boolean; last: boolean };

/**
 * Week or month buckets the chart only partly covers: the first when the range starts partway into it, and the
 * last when it is not over by the date the chart runs to — the range end, or `today` for All, whose range ends at
 * the latest spend.
 */
export const partialBucketEdges = (
  meta: DashboardOverviewMeta,
  today: string
): PartialBucketEdges => {
  if (!meta.range || meta.range.grain === 'day') {
    return { first: false, last: false };
  }
  const { from, to, grain } = meta.range;
  const through = meta.kind === 'all' ? today : to;
  return {
    first: from !== bucketBounds(from, grain).from,
    last: through < bucketBounds(to, grain).to,
  };
};

export const segmentPartialBuckets = (
  data: SpendTrendChartPoint[],
  edges: PartialBucketEdges
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

/** The window the chart compares against; All has none. */
export const spendTrendPriorRange = (
  meta: DashboardOverviewMeta
): CalendarDateRange | null =>
  meta.range?.priorFrom && meta.range.priorTo
    ? { from: meta.range.priorFrom, to: meta.range.priorTo }
    : null;

/** All with no spend has no range; it would chart monthly. */
export const spendTrendGrain = (
  meta: DashboardOverviewMeta
): DashboardOverviewGrain => meta.range?.grain ?? 'month';

/** Read from the response, so labels always match the data on screen, including while a new period loads. */
export const spendTrendSeriesLabels = (
  meta: DashboardOverviewMeta
): SpendTrendSeriesLabels =>
  spendTrendPriorRange(meta)
    ? { current: 'This period', prior: 'Prior period' }
    : { current: 'Spend', prior: '' };

/** Says what the y-axis measures, since comparisons chart running totals and All charts per-bucket spend. */
export const spendTrendCaption = (meta: DashboardOverviewMeta): string => {
  const prior = spendTrendPriorRange(meta);
  if (prior) {
    return `Running total vs ${formatCalendarDateRange(prior)}`;
  }
  return `Spend per ${spendTrendGrain(meta)}`;
};

/**
 * A comparison charts running totals, so each point reads "spent so far" against the prior window.
 * Without one, each point is that bucket's own spend.
 */
export const toSpendTrendChartData = ({
  meta,
  trend,
}: GetDashboardOverviewResponse): SpendTrendChartPoint[] => {
  if (spendTrendPriorRange(meta) === null) {
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
  week: { axis: 'MMM d', tooltip: "'Week of' MMM d, yyyy" },
  month: { axis: 'MMM yyyy', tooltip: 'MMMM yyyy' },
} satisfies Record<DashboardOverviewGrain, { axis: string; tooltip: string }>;

export const formatTrendBucket = (
  bucketStart: string,
  grain: DashboardOverviewGrain,
  target: 'axis' | 'tooltip'
): string =>
  format(parseCalendarDate(bucketStart), bucketFormats[grain][target]);
