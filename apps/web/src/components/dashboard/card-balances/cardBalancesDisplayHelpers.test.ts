import { describe, expect, it } from 'vitest';
import { toFirstName } from '@/components/dashboard/card-balances/cardBalancesDisplayHelpers';

describe('toFirstName', () => {
  it('returns first token of display name', () => {
    expect(toFirstName('Tamir Arnesty')).toBe('Tamir');
    expect(toFirstName('Emily')).toBe('Emily');
  });
});
