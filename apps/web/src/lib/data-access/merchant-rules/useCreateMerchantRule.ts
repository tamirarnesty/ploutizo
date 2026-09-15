import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { MerchantRule } from './useGetMerchantRules';

interface CreateMerchantRuleBody {
  pattern: string;
  matchType: string;
  renameTo?: string;
  categoryId?: string | null;
  priority?: number;
}

export const createMerchantRule = async (
  body: CreateMerchantRuleBody
): Promise<MerchantRule> => {
  const r = await apiFetch<{ data: MerchantRule }>('/api/merchant-rules', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateMerchantRule = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMerchantRule,
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'merchant-rules'),
      }),
  });
};
