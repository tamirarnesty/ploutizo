import { queryOptions, useQuery } from '@tanstack/react-query';
import type { GetSettlementBalancesResponse } from '@ploutizo/types';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import type { UseQueryResult } from '@tanstack/react-query';

// GET /api/settlements returns GetSettlementBalancesResponse directly (no { data } envelope)
// per apps/api/src/routes/settlements.ts line 13.
export const fetchSettlements =
  async (): Promise<GetSettlementBalancesResponse> => {
    return apiFetch<GetSettlementBalancesResponse>('/api/settlements');
  };

export const settlementsQueryOptions = (access: ActiveHouseholdAccess) =>
  queryOptions({
    queryKey: householdQueryKey(access, 'settlements'),
    queryFn: fetchSettlements,
  });

export const useGetSettlements =
  (): UseQueryResult<GetSettlementBalancesResponse> => {
    const access = useActiveHouseholdAccess();
    return useQuery(settlementsQueryOptions(access));
  };
