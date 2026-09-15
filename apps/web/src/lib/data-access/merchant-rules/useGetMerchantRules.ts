import { queryOptions, useQuery } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
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

export const fetchMerchantRules = async (): Promise<MerchantRule[]> => {
  const r = await apiFetch<{ data: MerchantRule[] }>('/api/merchant-rules');
  return r.data;
};

export const merchantRulesQueryOptions = (access: ActiveHouseholdAccess) =>
  queryOptions({
    queryKey: householdQueryKey(access, 'merchant-rules'),
    queryFn: fetchMerchantRules,
  });

export const useGetMerchantRules = (): UseQueryResult<MerchantRule[]> => {
  const access = useActiveHouseholdAccess();
  return useQuery(merchantRulesQueryOptions(access));
};
