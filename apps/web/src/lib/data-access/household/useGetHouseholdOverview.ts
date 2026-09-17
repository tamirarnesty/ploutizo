import { queryOptions } from '@tanstack/react-query';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export interface HouseholdOverview {
  name: string | null;
  imageUrl: string | null;
}

export const fetchHouseholdOverview = async (
  signal?: AbortSignal
): Promise<HouseholdOverview> => {
  const r = await apiFetch<{ data: HouseholdOverview }>('/api/households', {
    signal,
  });
  return r.data;
};

export const householdOverviewQueryOptions = queryOptions({
  queryKey: ['household-overview'],
  queryFn: ({ signal }) => fetchHouseholdOverview(signal),
});

export const useGetHouseholdOverview =
  (): UseQueryResult<HouseholdOverview> => {
    return useHouseholdQuery(householdOverviewQueryOptions);
  };
