import {
  eachCalendarDate,
  eachCalendarMonthStart,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardOverviewQuery,
  RangedDashboardOverviewQuery,
} from '@ploutizo/validators';
import type {
  DashboardOverviewBucket,
  DashboardOverviewRange,
  DashboardOverviewTrendPoint,
  GetDashboardOverviewResponse,
} from '@ploutizo/types';
import type { SpendTrendBucketRow } from '@/lib/queries/dashboard';
import { fetchDailyNetSpend } from '@/lib/queries/dashboard';

const bucketStartOf = (day: string, bucket: DashboardOverviewBucket): string =>
  bucket === 'day' ? day : `${day.slice(0, 7)}-01`;

const bucketStartsIn = (
  range: DashboardOverviewRange,
  bucket: DashboardOverviewBucket
): string[] =>
  bucket === 'day'
    ? eachCalendarDate(range.from, range.to)
    : eachCalendarMonthStart(range.from, range.to);

const sumByBucket = (
  rows: SpendTrendBucketRow[],
  bucket: DashboardOverviewBucket
): Map<string, number> => {
  const amounts = new Map<string, number>();
  for (const row of rows) {
    const start = bucketStartOf(row.bucketStart, bucket);
    amounts.set(start, (amounts.get(start) ?? 0) + row.amountCents);
  }
  return amounts;
};

const fetchAmountsByBucket = async (
  orgId: string,
  range: DashboardOverviewRange,
  bucket: DashboardOverviewBucket
): Promise<Map<string, number>> =>
  sumByBucket(await fetchDailyNetSpend(orgId, range), bucket);

type PriorAmounts = {
  range: DashboardOverviewRange;
  amounts: Map<string, number>;
};

/** Prior buckets map onto current buckets by index; buckets past the prior window's end have no prior amount. */
const buildTrend = (
  range: DashboardOverviewRange,
  bucket: DashboardOverviewBucket,
  amounts: Map<string, number>,
  prior: PriorAmounts | null
): DashboardOverviewTrendPoint[] => {
  const priorStarts = prior ? bucketStartsIn(prior.range, bucket) : [];
  return bucketStartsIn(range, bucket).map((start, index) => {
    const priorStart = priorStarts.at(index);
    return {
      bucketStart: start,
      amountCents: amounts.get(start) ?? 0,
      priorAmountCents:
        prior && priorStart !== undefined
          ? (prior.amounts.get(priorStart) ?? 0)
          : null,
    };
  });
};

const getRangedOverview = async (
  orgId: string,
  query: RangedDashboardOverviewQuery
): Promise<GetDashboardOverviewResponse> => {
  const { bucket } = query;
  const range = { from: query.from, to: query.to };
  const priorRange =
    query.priorFrom && query.priorTo
      ? { from: query.priorFrom, to: query.priorTo }
      : null;
  const [amounts, priorAmounts] = await Promise.all([
    fetchAmountsByBucket(orgId, range, bucket),
    priorRange ? fetchAmountsByBucket(orgId, priorRange, bucket) : null,
  ]);

  return {
    meta: { range, prior: priorRange, bucket },
    trend: buildTrend(
      range,
      bucket,
      amounts,
      priorRange && priorAmounts
        ? { range: priorRange, amounts: priorAmounts }
        : null
    ),
  };
};

const getAllTimeOverview = async (
  orgId: string
): Promise<GetDashboardOverviewResponse> => {
  const rows = await fetchDailyNetSpend(orgId, {});
  if (rows.length === 0) {
    return { meta: { range: null, prior: null, bucket: 'month' }, trend: [] };
  }

  const days = rows.map((row) => row.bucketStart).sort();
  const range = { from: days[0], to: days.at(-1)! };
  return {
    meta: { range, prior: null, bucket: 'month' },
    trend: buildTrend(range, 'month', sumByBucket(rows, 'month'), null),
  };
};

export const getDashboardOverview = async (
  orgId: string,
  query: DashboardOverviewQuery
): Promise<GetDashboardOverviewResponse> =>
  'from' in query
    ? getRangedOverview(orgId, query as RangedDashboardOverviewQuery)
    : getAllTimeOverview(orgId);
