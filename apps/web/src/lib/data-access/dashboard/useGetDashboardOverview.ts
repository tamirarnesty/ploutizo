import { queryOptions } from '@tanstack/react-query';
import type { ResolvedDashboardPeriod } from '@ploutizo/utils/dashboard-period';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const dashboardOverviewQueryKey = ['dashboard-overview'] as const;

/** Empty for All, which the API resolves from the household's spend. */
const overviewSearch = (period: ResolvedDashboardPeriod): string => {
  if (period.kind === 'all') {
    return '';
  }
  return new URLSearchParams({
    from: period.from,
    to: period.to,
    bucket: period.bucket,
    ...(period.prior
      ? { priorFrom: period.prior.from, priorTo: period.prior.to }
      : {}),
  }).toString();
};

const overviewQueryKey = (period: ResolvedDashboardPeriod) =>
  [...dashboardOverviewQueryKey, overviewSearch(period) || 'all'] as const;

const overviewRequestPath = (period: ResolvedDashboardPeriod) => {
  const search = overviewSearch(period);
  return search
    ? `/api/dashboard/overview?${search}`
    : '/api/dashboard/overview';
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
