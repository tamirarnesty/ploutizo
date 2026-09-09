import { describe, expect, it } from 'vitest';
import { normalizePathname } from './normalizePathname';

describe('normalizePathname', () => {
  it('removes trailing slashes except for root', () => {
    expect(normalizePathname('/settings/')).toBe('/settings');
    expect(normalizePathname('/settings')).toBe('/settings');
    expect(normalizePathname('/')).toBe('/');
  });
});
