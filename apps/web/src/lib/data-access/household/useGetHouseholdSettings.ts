import { queryOptions } from '@tanstack/react-query';
import { dataEnvelope, householdSettingsSchema } from '@ploutizo/validators';
import type { HouseholdSettings } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export type { HouseholdSettings };

export const fetchHouseholdSettings = async (
  signal?: AbortSignal
): Promise<HouseholdSettings> => {
  const r = await apiFetch(
    '/api/households/settings',
    dataEnvelope(householdSettingsSchema),
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
