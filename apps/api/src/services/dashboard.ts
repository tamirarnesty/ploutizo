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
import {
  fetchNetSpendByBucket,
  fetchSpendDateBounds,
} from '@/lib/queries/dashboard';

const bucketStartsIn = (
  range: DashboardOverviewRange,
  bucket: DashboardOverviewBucket
): string[] =>
  bucket === 'day'
    ? eachCalendarDate(range.from, range.to)
    : eachCalendarMonthStart(range.from, range.to);

const fetchAmountsByBucket = async (
  orgId: string,
  bucket: DashboardOverviewBucket,
  range: Partial<DashboardOverviewRange>
): Promise<Map<string, number>> => {
  const rows = await fetchNetSpendByBucket(orgId, bucket, range);
  return new Map(rows.map((row) => [row.bucketStart, row.amountCents]));
};

/** Prior buckets map onto current buckets by index; buckets past the prior window's end have no prior amount. */
const buildTrend = (
  range: DashboardOverviewRange,
  bucket: DashboardOverviewBucket,
  amounts: Map<string, number>,
  prior: { range: DashboardOverviewRange; amounts: Map<string, number> } | null
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
  const [amounts, prior] = await Promise.all([
    fetchAmountsByBucket(orgId, bucket, range),
    priorRange
      ? fetchAmountsByBucket(orgId, bucket, priorRange).then(
          (priorAmounts) => ({
            range: priorRange,
            amounts: priorAmounts,
          })
        )
      : null,
  ]);

  return {
    meta: { range, prior: priorRange, bucket },
    trend: buildTrend(range, bucket, amounts, prior),
  };
};

const getAllTimeOverview = async (
  orgId: string
): Promise<GetDashboardOverviewResponse> => {
  const [{ first, last }, amounts] = await Promise.all([
    fetchSpendDateBounds(orgId),
    fetchAmountsByBucket(orgId, 'month', {}),
  ]);
  if (first === null || last === null) {
    return { meta: { range: null, prior: null, bucket: 'month' }, trend: [] };
  }

  const range = { from: first, to: last };
  return {
    meta: { range, prior: null, bucket: 'month' },
    trend: buildTrend(range, 'month', amounts, null),
  };
};

export const getDashboardOverview = async (
  orgId: string,
  query: DashboardOverviewQuery
): Promise<GetDashboardOverviewResponse> =>
  'from' in query
    ? getRangedOverview(orgId, query as RangedDashboardOverviewQuery)
    : getAllTimeOverview(orgId);
