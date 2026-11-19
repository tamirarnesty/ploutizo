import { queryOptions } from '@tanstack/react-query';
import { dashboardOverviewResponseSchema } from '@ploutizo/validators';
import type { ResolvedDashboardPeriod } from '@ploutizo/utils/dashboard-period';
import type { GetDashboardOverviewResponse } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { useOfflineReadableQuery } from '@/lib/offline/offline-query';
import { readDashboardPeriod } from '@/lib/offline/offline-read-store';
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
      apiFetch(
        `/api/dashboard/overview${search}`,
        dashboardOverviewResponseSchema,
        { signal }
      ),
    placeholderData: (previousData) => previousData,
  });
};

export const useGetDashboardOverview = (
  period: ResolvedDashboardPeriod
): UseQueryResult<GetDashboardOverviewResponse> & {
  offlineUnavailable: boolean;
} => {
  const query = useHouseholdQuery(dashboardOverviewQueryOptions(period));
  return useOfflineReadableQuery(query, () => readDashboardPeriod(period));
};
