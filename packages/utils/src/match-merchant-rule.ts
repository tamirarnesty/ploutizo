import type { MerchantMatchType } from '@ploutizo/types';

export interface MerchantRuleMatchInput {
  pattern: string;
  matchType: MerchantMatchType;
}

/** Soft caps for tenant regex patterns during classification matching. */
export const MERCHANT_REGEX_MAX_PATTERN_LENGTH = 200;
export const MERCHANT_REGEX_MAX_HAYSTACK_LENGTH = 2_000;

/**
 * Heuristic guard against common catastrophic-backtracking shapes.
 * Invalid or unsafe patterns are treated as non-matches during classification.
 */
export const isSafeMerchantRegexPattern = (pattern: string): boolean => {
  const trimmed = pattern.trim();
  if (!trimmed) return false;
  if (trimmed.length > MERCHANT_REGEX_MAX_PATTERN_LENGTH) return false;

  // Nested quantifiers / overlapping repetitions: (a+)+, (a*)*, (a+){2,}, etc.
  if (/(\([^()]*[+*][^()]*\))[+*?]/.test(trimmed)) return false;
  if (/([+*]\??)\1/.test(trimmed)) return false;
  // Ambiguous adjacent quantified wildcards: .+?*.+ or .*a+
  if (/(\.\*|\.\+){2,}/.test(trimmed)) return false;

  try {
    void new RegExp(trimmed, 'i');
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
      if (!isSafeMerchantRegexPattern(pattern)) return false;
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
