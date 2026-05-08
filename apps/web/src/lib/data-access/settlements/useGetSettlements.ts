import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { GetSettlementBalancesResponse } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

// GET /api/settlements returns GetSettlementBalancesResponse directly (no { data } envelope)
// per apps/api/src/routes/settlements.ts line 13.
export const fetchSettlements =
  async (): Promise<GetSettlementBalancesResponse> => {
    return apiFetch<GetSettlementBalancesResponse>('/api/settlements');
  };

export const useGetSettlements =
  (): UseQueryResult<GetSettlementBalancesResponse> => {
    return useQuery({
      queryKey: ['settlements'],
      queryFn: fetchSettlements,
    });
  };
