import { useQuery } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export interface HouseholdSettings {
  settlementThreshold: number | null;
}

export const fetchHouseholdSettings = async (): Promise<HouseholdSettings> => {
  const r = await apiFetch<{ data: HouseholdSettings }>(
    '/api/households/settings'
  );
  return r.data;
};

export const useGetHouseholdSettings =
  (): UseQueryResult<HouseholdSettings> => {
    const access = useActiveHouseholdAccess();
    return useQuery({
      queryKey: householdQueryKey(access, 'household-settings'),
      queryFn: fetchHouseholdSettings,
    });
  };
