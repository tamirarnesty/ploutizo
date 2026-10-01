import type { MerchantRule } from '@ploutizo/validators';

export type MerchantRuleMatchType = MerchantRule['matchType'];

export const MATCH_TYPE_LABELS: Record<MerchantRuleMatchType, string> = {
  exact: 'Exact',
  contains: 'Contains',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  regex: 'Regex',
};
