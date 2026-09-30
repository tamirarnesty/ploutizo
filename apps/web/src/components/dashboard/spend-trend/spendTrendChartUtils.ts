import { format } from 'date-fns';
import {
  bucketBounds,
  formatCalendarDateRange,
  parseCalendarDate,
} from '@ploutizo/utils/dashboard-period';
import type {
  CalendarDateRange,
  DashboardOverviewGrain,
} from '@ploutizo/types';
import type {
  DashboardOverviewMeta,
  DashboardOverviewTrendPoint,
  GetDashboardOverviewResponse,
} from '@ploutizo/validators';
import type { SpendTrendMode } from '@/lib/spend-trend-mode';

export const hasSpendActivity = (
  trend: DashboardOverviewTrendPoint[]
): boolean =>
  trend.some(
    (point) => point.amountCents !== 0 || (point.priorAmountCents ?? 0) !== 0
  );

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
 * the latest spend. All's first bucket is always whole: its range starts at the first spend, with none before it.
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
    first: meta.kind !== 'all' && from !== bucketBounds(from, grain).from,
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

/** Names each mode in the chart's toggle, per bucket in the grain on screen. */
export const spendTrendModeLabel = (
  mode: SpendTrendMode,
  grain: DashboardOverviewGrain
): string => (mode === 'running' ? 'Running total' : `Per ${grain}`);

/** Says what the y-axis measures and, when there is one, the window it is compared against. */
export const spendTrendCaption = (
  meta: DashboardOverviewMeta,
  mode: SpendTrendMode
): string => {
  const measure =
    mode === 'running' ? 'Running total' : `Spend per ${spendTrendGrain(meta)}`;
  const prior = spendTrendPriorRange(meta);
  return prior ? `${measure} vs ${formatCalendarDateRange(prior)}` : measure;
};

/**
 * Running mode reads each point as "spent so far", for both series. Bucket mode charts each bucket's own spend
 * against the prior window's matching bucket. Buckets with no prior counterpart have no prior point in either.
 */
export const toSpendTrendChartData = (
  { trend }: GetDashboardOverviewResponse,
  mode: SpendTrendMode
): SpendTrendChartPoint[] => {
  if (mode === 'bucket') {
    return trend.map((point) => ({
      bucketStart: point.bucketStart,
      current: point.amountCents,
      prior: point.priorAmountCents,
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
