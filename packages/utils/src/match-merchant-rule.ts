import type { MerchantMatchType } from '@ploutizo/types';

export interface MerchantRuleMatchInput {
  pattern: string;
  matchType: MerchantMatchType;
}

/** Case-insensitive merchant-rule match against a description. */
export const matchesMerchantRule = (
  description: string,
  rule: MerchantRuleMatchInput
): boolean => {
  const haystack = description.trim();
  if (!haystack) return false;

  const pattern = rule.pattern.trim();
  if (!pattern) return false;

  const upperHaystack = haystack.toUpperCase();
  const upperPattern = pattern.toUpperCase();

  switch (rule.matchType) {
    case 'exact':
      return upperHaystack === upperPattern;
    case 'contains':
      return upperHaystack.includes(upperPattern);
    case 'starts_with':
      return upperHaystack.startsWith(upperPattern);
    case 'ends_with':
      return upperHaystack.endsWith(upperPattern);
    case 'regex': {
      try {
        return new RegExp(pattern, 'i').test(haystack);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
};

/**
 * First match wins. Rules must already be ordered by ascending priority.
 */
export const findMatchingMerchantRule = <T extends MerchantRuleMatchInput>(
  description: string,
  rules: readonly T[]
): T | null => {
  for (const rule of rules) {
    if (matchesMerchantRule(description, rule)) return rule;
  }
  return null;
};
