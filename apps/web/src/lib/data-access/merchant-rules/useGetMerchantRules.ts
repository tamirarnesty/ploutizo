import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';

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

export const fetchMerchantRules = async (): Promise<MerchantRule[]> => {
  const r = await apiFetch<{ data: MerchantRule[] }>('/api/merchant-rules');
  return r.data;
};

export const useGetMerchantRules = (): UseQueryResult<MerchantRule[]> => {
  return useQuery({
    queryKey: ['merchant-rules'],
    queryFn: fetchMerchantRules,
  });
};
