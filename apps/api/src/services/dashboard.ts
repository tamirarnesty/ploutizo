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
  { range, bucket, prior }: RangedDashboardOverviewQuery
): Promise<GetDashboardOverviewResponse> => {
  const [amounts, priorAmounts] = await Promise.all([
    fetchAmountsByBucket(orgId, bucket, range),
    prior ? fetchAmountsByBucket(orgId, bucket, prior) : null,
  ]);

  return {
    meta: { kind: 'ranged', range, prior, bucket },
    trend: buildTrend(
      range,
      bucket,
      amounts,
      prior && priorAmounts ? { range: prior, amounts: priorAmounts } : null
    ),
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
    return {
      meta: { kind: 'all', range: null, prior: null, bucket: 'month' },
      trend: [],
    };
  }

  const range = { from: first, to: last };
  return {
    meta: { kind: 'all', range, prior: null, bucket: 'month' },
    trend: buildTrend(range, 'month', amounts, null),
  };
};

export const getDashboardOverview = async (
  orgId: string,
  query: DashboardOverviewQuery
): Promise<GetDashboardOverviewResponse> =>
  query.kind === 'ranged'
    ? getRangedOverview(orgId, query)
    : getAllTimeOverview(orgId);
