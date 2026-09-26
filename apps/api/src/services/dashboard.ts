import {
  eachCalendarDate,
  parseCalendarDate,
  resolveMonthToDateRange,
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

/** Month-to-date daily net spend ending on `to`, paired by day index with the prior month. */
export const getDashboardOverview = async (
  orgId: string,
  to: string
): Promise<GetDashboardOverviewResponse> => {
  const range = resolveMonthToDateRange(parseCalendarDate(to));
  const [current, prior] = await Promise.all([
    amountsByDay(orgId, range.from, range.to),
    amountsByDay(orgId, range.priorFrom, range.priorTo),
  ]);
  const priorDays = eachCalendarDate(range.priorFrom, range.priorTo);

  return {
    meta: { range },
    trend: eachCalendarDate(range.from, range.to).map((day, index) => {
      // Past the end of a shorter prior month there is no comparable day.
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
