import { queryOptions } from '@tanstack/react-query';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export interface MerchantRule {
  id: string;
  orgId: string;
  pattern: string;
  matchType: 'exact' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  renameTo: string | null;
  categoryId: string | null;
  assigneeId: string | null;
  priority: number;
  createdAt: string;
}

export const fetchMerchantRules = async (
  signal?: AbortSignal
): Promise<MerchantRule[]> => {
  const r = await apiFetch<{ data: MerchantRule[] }>('/api/merchant-rules', {
    signal,
  });
  return r.data;
};

export const merchantRulesQueryOptions = () =>
  queryOptions({
    queryKey: ['merchant-rules'],
    queryFn: ({ signal }) => fetchMerchantRules(signal),
  });

export const useGetMerchantRules = (): UseQueryResult<MerchantRule[]> => {
  return useHouseholdQuery(merchantRulesQueryOptions());
};
