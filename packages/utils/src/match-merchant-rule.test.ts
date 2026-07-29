import { describe, expect, it } from 'vitest';
import {
  isValidMerchantRegexPattern,
  matchesMerchantRule,
} from './match-merchant-rule';

describe('isValidMerchantRegexPattern', () => {
  it('accepts syntactically valid patterns within length cap', () => {
    expect(isValidMerchantRegexPattern('amazon')).toBe(true);
    expect(isValidMerchantRegexPattern('(a+){2,}$')).toBe(true);
    expect(isValidMerchantRegexPattern('^(a|aa)+$')).toBe(true);
  });

  it('rejects empty, overlong, and invalid syntax', () => {
    expect(isValidMerchantRegexPattern('')).toBe(false);
    expect(isValidMerchantRegexPattern('a'.repeat(121))).toBe(false);
    expect(isValidMerchantRegexPattern('(')).toBe(false);
  });
});

describe('matchesMerchantRule — regex via RE2', () => {
  it('matches without catastrophic backtracking on near-miss input', () => {
    const start = performance.now();
    const matched = matchesMerchantRule('a'.repeat(30) + 'b', {
      matchType: 'regex',
      pattern: '(a+){2,}$',
    });
    const elapsed = performance.now() - start;

    expect(matched).toBe(false);
    expect(elapsed).toBeLessThan(100);
  });

  it('matches simple regex patterns', () => {
    expect(
      matchesMerchantRule('AMAZON MARKETPLACE', {
        matchType: 'regex',
        pattern: 'amazon',
      })
    ).toBe(true);
  });

  it('supports non-regex match types unchanged', () => {
    expect(
      matchesMerchantRule('STARBUCKS', {
        matchType: 'contains',
        pattern: 'star',
      })
    ).toBe(true);
  });
});
