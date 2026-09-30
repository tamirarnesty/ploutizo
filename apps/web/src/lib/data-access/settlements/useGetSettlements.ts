import { queryOptions } from '@tanstack/react-query';
import { settlementBalancesResponseSchema } from '@ploutizo/validators';
import type { GetSettlementBalancesResponse } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchSettlements = (
  signal?: AbortSignal
): Promise<GetSettlementBalancesResponse> =>
  apiFetch('/api/settlements', settlementBalancesResponseSchema, { signal });

export const settlementsQueryOptions = queryOptions({
  queryKey: ['settlements'],
  queryFn: ({ signal }) => fetchSettlements(signal),
});

export const useGetSettlements =
  (): UseQueryResult<GetSettlementBalancesResponse> => {
    return useHouseholdQuery(settlementsQueryOptions);
  };
