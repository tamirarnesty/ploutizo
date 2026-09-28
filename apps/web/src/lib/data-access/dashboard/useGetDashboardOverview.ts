import { queryOptions } from '@tanstack/react-query';
import type { ResolvedDashboardPeriod } from '@ploutizo/utils/dashboard-period';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const dashboardOverviewQueryKey = ['dashboard-overview'] as const;

/** The API derives the prior window from the dates and shortcut, and the grain from the dates; All sends none. */
export const dashboardOverviewQueryOptions = (
  period: ResolvedDashboardPeriod
) => {
  const search =
    period.kind === 'all'
      ? ''
      : `?${new URLSearchParams({
          from: period.from,
          to: period.to,
          ...(period.shortcut ? { shortcut: period.shortcut } : {}),
        }).toString()}`;
  return queryOptions({
    queryKey:
      period.kind === 'all'
        ? [...dashboardOverviewQueryKey, 'all']
        : [
            ...dashboardOverviewQueryKey,
            period.from,
            period.to,
            period.shortcut,
          ],
    queryFn: ({ signal }) =>
      apiFetch<GetDashboardOverviewResponse>(
        `/api/dashboard/overview${search}`,
        { signal }
      ),
    placeholderData: (previousData) => previousData,
  });
};

export const useGetDashboardOverview = (
  period: ResolvedDashboardPeriod
): UseQueryResult<GetDashboardOverviewResponse> =>
  useHouseholdQuery(dashboardOverviewQueryOptions(period));
