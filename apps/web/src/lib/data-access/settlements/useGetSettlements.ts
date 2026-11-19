import { queryOptions } from '@tanstack/react-query';
import { settlementBalancesResponseSchema } from '@ploutizo/validators';
import type { GetSettlementBalancesResponse } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { useOfflineReadableQuery } from '@/lib/offline/offline-query';
import { readSettlements } from '@/lib/offline/offline-read-store';
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
  (): UseQueryResult<GetSettlementBalancesResponse> & {
    offlineUnavailable: boolean;
  } => {
    const query = useHouseholdQuery(settlementsQueryOptions);
    return useOfflineReadableQuery(query, readSettlements);
  };
