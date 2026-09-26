import { queryOptions } from '@tanstack/react-query';
import {
  parseCalendarDate,
  resolveMonthToDateRange,
} from '@ploutizo/utils/dashboard-period';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const dashboardOverviewQueryKey = ['dashboard-overview'] as const;

/** `today` is a local calendar date (`yyyy-MM-dd`); the overview covers its month to date. */
export const dashboardOverviewQueryOptions = (today: string) => {
  const { from, to } = resolveMonthToDateRange(parseCalendarDate(today));
  const params = new URLSearchParams({ from, to });
  return queryOptions({
    queryKey: [...dashboardOverviewQueryKey, from, to],
    queryFn: ({ signal }) =>
      apiFetch<GetDashboardOverviewResponse>(
        `/api/dashboard/overview?${params.toString()}`,
        { signal }
      ),
    placeholderData: (previousData) => previousData,
  });
};

export const useGetDashboardOverview = (
  today: string
): UseQueryResult<GetDashboardOverviewResponse> =>
  useHouseholdQuery(dashboardOverviewQueryOptions(today));
