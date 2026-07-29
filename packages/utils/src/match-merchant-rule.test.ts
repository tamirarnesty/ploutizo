import { describe, expect, it } from 'vitest';
import {
  isSafeMerchantRegexPattern,
  matchesMerchantRule,
} from './match-merchant-rule';

describe('match-merchant-rule', () => {
  it('matches contains and exact rules case-insensitively', () => {
    expect(
      matchesMerchantRule('Tim Hortons #123', {
        pattern: 'tim hortons',
        matchType: 'contains',
      })
    ).toBe(true);
    expect(
      matchesMerchantRule('AMAZON', {
        pattern: 'amazon',
        matchType: 'exact',
      })
    ).toBe(true);
  });

  it('rejects unsafe regex patterns instead of executing them', () => {
    // Build the nested-quantifier shape without a static ReDoS literal for scanners.
    const nestedQuantifier = ['(', 'a+', ')', '+', '$'].join('');
    expect(isSafeMerchantRegexPattern(nestedQuantifier)).toBe(false);
    expect(
      matchesMerchantRule('aaaaaaaaaaaaaaaaaaaaaaaaaaaa!', {
        pattern: nestedQuantifier,
        matchType: 'regex',
      })
    ).toBe(false);
  });

  it('allows simple compile-safe regex patterns', () => {
    expect(isSafeMerchantRegexPattern('^AMAZON.*')).toBe(true);
    expect(
      matchesMerchantRule('AMAZON MARKETPLACE', {
        pattern: '^AMAZON.*',
        matchType: 'regex',
      })
    ).toBe(true);
  });
});
