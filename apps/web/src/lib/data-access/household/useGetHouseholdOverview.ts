import { queryOptions } from '@tanstack/react-query';
import { dataEnvelope, householdOverviewSchema } from '@ploutizo/validators';
import type { HouseholdOverview } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchHouseholdOverview = async (
  signal?: AbortSignal
): Promise<HouseholdOverview> => {
  const r = await apiFetch(
    '/api/households',
    dataEnvelope(householdOverviewSchema),
    { signal }
  );
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
