import {
  bucketStartsIn,
  dashboardPriorRange,
  dashboardRangeGrain,
} from '@ploutizo/utils/dashboard-period';
import type { DashboardRangedShortcut } from '@ploutizo/utils/dashboard-period';
import type {
  DashboardOverviewQuery,
  DashboardOverviewTrendPoint,
  GetDashboardOverviewResponse,
} from '@ploutizo/validators';
import type {
  CalendarDateRange,
  DashboardOverviewGrain,
} from '@ploutizo/types';
import {
  fetchNetSpendByBucket,
  fetchNetSpendByCategory,
  fetchSpendDateBounds,
} from '@/lib/queries/dashboard';
import { buildOverviewCategories } from '@/services/dashboard-categories';

const fetchAmountsByBucket = async (
  orgId: string,
  grain: DashboardOverviewGrain,
  range: Partial<CalendarDateRange>
): Promise<Map<string, number>> => {
  const rows = await fetchNetSpendByBucket(orgId, grain, range);
  return new Map(rows.map((row) => [row.bucketStart, row.amountCents]));
};

/** Prior buckets map onto current buckets by index; buckets past the prior window's end have no prior amount. */
const buildTrend = (
  range: CalendarDateRange,
  grain: DashboardOverviewGrain,
  amounts: Map<string, number>,
  prior: { range: CalendarDateRange; amounts: Map<string, number> } | null
): DashboardOverviewTrendPoint[] => {
  const priorStarts = prior ? bucketStartsIn(prior.range, grain) : [];
  return bucketStartsIn(range, grain).map((start, index) => {
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
  range: CalendarDateRange,
  shortcut: DashboardRangedShortcut | null
): Promise<GetDashboardOverviewResponse> => {
  const grain = dashboardRangeGrain(range);
  const prior = dashboardPriorRange(range, shortcut);
  const [amounts, priorAmounts, categoryRows, priorCategoryRows] =
    await Promise.all([
      fetchAmountsByBucket(orgId, grain, range),
      fetchAmountsByBucket(orgId, grain, prior),
      fetchNetSpendByCategory(orgId, range),
      fetchNetSpendByCategory(orgId, prior),
    ]);

  const priorByCategoryId = new Map(
    priorCategoryRows.map((row) => [row.categoryId, row.amountCents])
  );

  return {
    meta: {
      kind: 'ranged',
      range: { ...range, priorFrom: prior.from, priorTo: prior.to, grain },
    },
    trend: buildTrend(range, grain, amounts, {
      range: prior,
      amounts: priorAmounts,
    }),
    categories: buildOverviewCategories(categoryRows, priorByCategoryId),
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
    return { meta: { kind: 'all', range: null }, trend: [], categories: [] };
  }

  const range = { from: first, to: last };
  const categoryRows = await fetchNetSpendByCategory(orgId, range);
  return {
    meta: {
      kind: 'all',
      range: { ...range, priorFrom: null, priorTo: null, grain: 'month' },
    },
    trend: buildTrend(range, 'month', amounts, null),
    categories: buildOverviewCategories(categoryRows, null),
  };
};

export const getDashboardOverview = async (
  orgId: string,
  query: DashboardOverviewQuery
): Promise<GetDashboardOverviewResponse> =>
  query.kind === 'ranged'
    ? getRangedOverview(
        orgId,
        { from: query.from, to: query.to },
        query.shortcut
      )
    : getAllTimeOverview(orgId);
