import type { MerchantRule } from '@/lib/data-access/merchant-rules';

export type MerchantRuleMatchType = MerchantRule['matchType'];

export const MATCH_TYPE_LABELS: Record<MerchantRuleMatchType, string> = {
  exact: 'Exact',
  contains: 'Contains',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  regex: 'Regex',
};
