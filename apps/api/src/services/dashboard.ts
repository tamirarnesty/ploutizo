import {
  eachCalendarDate,
  eachCalendarMonthStart,
} from '@ploutizo/utils/dashboard-period';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import { fetchDailyNetSpend } from '@/lib/queries/dashboard';

const amountsByDay = async (
  orgId: string,
  from: string,
  to: string
): Promise<Map<string, number>> => {
  const rows = await fetchDailyNetSpend(orgId, { from, to });
  return new Map(rows.map((row) => [row.bucketStart, row.amountCents]));
};

type RangedOverviewQuery = {
  from: string;
  to: string;
  priorFrom: string;
  priorTo: string;
};

const buildDailyTrend = async (
  orgId: string,
  range: RangedOverviewQuery
): Promise<GetDashboardOverviewResponse> => {
  const [current, prior] = await Promise.all([
    amountsByDay(orgId, range.from, range.to),
    amountsByDay(orgId, range.priorFrom, range.priorTo),
  ]);
  const priorDays = eachCalendarDate(range.priorFrom, range.priorTo);

  return {
    meta: { range },
    trend: eachCalendarDate(range.from, range.to).map((day, index) => {
      const priorDay = priorDays.at(index);
      return {
        bucketStart: day,
        amountCents: current.get(day) ?? 0,
        priorAmountCents:
          priorDay === undefined ? null : (prior.get(priorDay) ?? 0),
      };
    }),
  };
};

const buildAllTimeMonthlyTrend = async (
  orgId: string
): Promise<GetDashboardOverviewResponse> => {
  const rows = await fetchDailyNetSpend(orgId, {});
  if (rows.length === 0) {
    return {
      meta: {
        range: {
          from: '',
          to: '',
          priorFrom: '',
          priorTo: '',
        },
      },
      trend: [],
    };
  }

  const sortedDays = rows.map((row) => row.bucketStart).sort();
  const from = sortedDays[0];
  const to = sortedDays.at(-1)!;
  const byMonth = new Map<string, number>();
  for (const row of rows) {
    const monthStart = row.bucketStart.slice(0, 7) + '-01';
    byMonth.set(monthStart, (byMonth.get(monthStart) ?? 0) + row.amountCents);
  }

  return {
    meta: {
      range: {
        from,
        to,
        priorFrom: '',
        priorTo: '',
      },
    },
    trend: eachCalendarMonthStart(from, to).map((monthStart) => ({
      bucketStart: monthStart,
      amountCents: byMonth.get(monthStart) ?? 0,
      priorAmountCents: null,
    })),
  };
};

export const getDashboardOverview = async (
  orgId: string,
  query: Record<string, never> | RangedOverviewQuery
): Promise<GetDashboardOverviewResponse> => {
  if (!('from' in query)) {
    return buildAllTimeMonthlyTrend(orgId);
  }

  return buildDailyTrend(orgId, query as RangedOverviewQuery);
};
