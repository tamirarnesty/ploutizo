import { queryOptions } from '@tanstack/react-query';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export interface HouseholdSettings {
  settlementThreshold: number | null;
}

export const fetchHouseholdSettings = async (
  signal?: AbortSignal
): Promise<HouseholdSettings> => {
  const r = await apiFetch<{ data: HouseholdSettings }>(
    '/api/households/settings',
    { signal }
  );
  return r.data;
};

export const householdSettingsQueryOptions = queryOptions({
  queryKey: ['household-settings'],
  queryFn: ({ signal }) => fetchHouseholdSettings(signal),
});

export const useGetHouseholdSettings =
  (): UseQueryResult<HouseholdSettings> => {
    return useHouseholdQuery(householdSettingsQueryOptions);
  };
