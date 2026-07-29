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
    expect(isSafeMerchantRegexPattern('(a+)+$')).toBe(false);
    expect(
      matchesMerchantRule('aaaaaaaaaaaaaaaaaaaaaaaaaaaa!', {
        pattern: '(a+)+$',
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
