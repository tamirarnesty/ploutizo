import { queryOptions } from '@tanstack/react-query';
import type { ResolvedDashboardPeriod } from '@ploutizo/utils/dashboard-period';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const dashboardOverviewQueryKey = ['dashboard-overview'] as const;

const overviewQueryKey = (period: ResolvedDashboardPeriod) => {
  if (period.kind === 'all') {
    return [...dashboardOverviewQueryKey, 'all'] as const;
  }
  const { from, to, priorFrom, priorTo } = period;
  return [...dashboardOverviewQueryKey, from, to, priorFrom, priorTo] as const;
};

const overviewRequestPath = (period: ResolvedDashboardPeriod) => {
  if (period.kind === 'all') {
    return '/api/dashboard/overview';
  }
  const params = new URLSearchParams({
    from: period.from,
    to: period.to,
    priorFrom: period.priorFrom,
    priorTo: period.priorTo,
  });
  return `/api/dashboard/overview?${params.toString()}`;
};

export const dashboardOverviewQueryOptions = (
  period: ResolvedDashboardPeriod
) =>
  queryOptions({
    queryKey: overviewQueryKey(period),
    queryFn: ({ signal }) =>
      apiFetch<GetDashboardOverviewResponse>(overviewRequestPath(period), {
        signal,
      }),
    placeholderData: (previousData) => previousData,
  });

export const useGetDashboardOverview = (
  period: ResolvedDashboardPeriod
): UseQueryResult<GetDashboardOverviewResponse> =>
  useHouseholdQuery(dashboardOverviewQueryOptions(period));
