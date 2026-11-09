import { dataEnvelope, merchantRuleSchema } from '@ploutizo/validators';
import type { MerchantRule } from '@ploutizo/validators';
import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
import { apiFetch } from '@/lib/queryClient';
import { merchantRulesQueryKey } from './useGetMerchantRules';

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
  const r = await apiFetch(
    '/api/merchant-rules',
    dataEnvelope(merchantRuleSchema),
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
  return r.data;
};

export const useCreateMerchantRule = () =>
  useInvalidatingMutation(createMerchantRule, [merchantRulesQueryKey]);
