import { queryOptions } from '@tanstack/react-query';
import {
  overviewQueryKeyRange,
  resolveFixedMtdOverviewRange,
} from '@ploutizo/utils/dashboard-period';
import type { DashboardPeriodRange } from '@ploutizo/utils/dashboard-period';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const buildDashboardOverviewQueryString = (
  range: DashboardPeriodRange
): string => {
  if (!range.from || !range.to) {
    return '';
  }
  const params = new URLSearchParams({
    from: range.from,
    to: range.to,
  });
  return `?${params.toString()}`;
};

export const fetchDashboardOverview = async (
  range: DashboardPeriodRange,
  signal?: AbortSignal
): Promise<GetDashboardOverviewResponse> => {
  const query = buildDashboardOverviewQueryString(range);
  return apiFetch<GetDashboardOverviewResponse>(
    `/api/dashboard/overview${query}`,
    {
      signal,
    }
  );
};

export const dashboardOverviewQueryOptions = (
  range: DashboardPeriodRange = resolveFixedMtdOverviewRange()
) =>
  queryOptions({
    queryKey: ['dashboard-overview', ...overviewQueryKeyRange(range)],
    queryFn: ({ signal }) => fetchDashboardOverview(range, signal),
  });

export const useGetDashboardOverview = (
  range: DashboardPeriodRange = resolveFixedMtdOverviewRange()
): UseQueryResult<GetDashboardOverviewResponse> =>
  useHouseholdQuery(dashboardOverviewQueryOptions(range));
