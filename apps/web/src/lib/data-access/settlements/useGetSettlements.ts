import { queryOptions } from '@tanstack/react-query';
import type { GetSettlementBalancesResponse } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

// GET /api/settlements returns GetSettlementBalancesResponse directly (no { data } envelope)
// per apps/api/src/routes/settlements.ts line 13.
export const fetchSettlements = async (
  signal?: AbortSignal
): Promise<GetSettlementBalancesResponse> => {
  return apiFetch<GetSettlementBalancesResponse>('/api/settlements', {
    signal,
  });
};

export const settlementsQueryOptions = queryOptions({
  queryKey: ['settlements'],
  queryFn: ({ signal }) => fetchSettlements(signal),
});

export const useGetSettlements =
  (): UseQueryResult<GetSettlementBalancesResponse> => {
    return useHouseholdQuery(settlementsQueryOptions);
  };
