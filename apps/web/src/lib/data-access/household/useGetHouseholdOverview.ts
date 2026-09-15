import { queryOptions, useQuery } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import type { UseQueryResult } from '@tanstack/react-query';

export interface HouseholdOverview {
  name: string | null;
  imageUrl: string | null;
}

export const householdOverviewQueryOptions = (access: ActiveHouseholdAccess) =>
  queryOptions({
    queryKey: householdQueryKey(access, 'household-overview'),
    queryFn: () =>
      apiFetch<{ data: HouseholdOverview }>('/api/households').then(
        (r) => r.data
      ),
  });

export const useGetHouseholdOverview =
  (): UseQueryResult<HouseholdOverview> => {
    const access = useActiveHouseholdAccess();
    return useQuery(householdOverviewQueryOptions(access));
  };
