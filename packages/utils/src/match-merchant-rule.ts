import RE2 from 're2';
import type { MerchantMatchType } from '@ploutizo/types';

export interface MerchantRuleMatchInput {
  pattern: string;
  matchType: MerchantMatchType;
}

export const MERCHANT_REGEX_MAX_PATTERN_LENGTH = 120;
export const MERCHANT_REGEX_MAX_HAYSTACK_LENGTH = 256;

/**
 * Syntax + length validation for tenant regex merchant rules.
 * Matching uses RE2 (linear time) — no heuristic backtracking guards.
 */
export const isValidMerchantRegexPattern = (pattern: string): boolean => {
  const trimmed = pattern.trim();
  if (!trimmed || trimmed.length > MERCHANT_REGEX_MAX_PATTERN_LENGTH) {
    return false;
  }
  try {
    void new RE2(trimmed, 'i');
    return true;
  } catch {
    return false;
  }
};

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
      if (haystack.length > MERCHANT_REGEX_MAX_HAYSTACK_LENGTH) return false;
      if (!isValidMerchantRegexPattern(pattern)) return false;
      try {
        return new RE2(pattern, 'i').test(haystack);
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
