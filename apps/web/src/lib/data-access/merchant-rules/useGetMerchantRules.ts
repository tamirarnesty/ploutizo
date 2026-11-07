import { merchantRuleSchema } from '@ploutizo/validators';
import { defineListQuery } from '@/lib/data-access/defineListQuery';

const list = defineListQuery({
  key: 'merchant-rules',
  path: '/api/merchant-rules',
  itemSchema: merchantRuleSchema,
});

export const merchantRulesQueryKey = list.queryKey;
export const fetchMerchantRules = list.fetch;
export const merchantRulesQueryOptions = list.queryOptions;
export const useGetMerchantRules = list.useQuery;
