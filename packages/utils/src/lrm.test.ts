import { describe, expect, it } from 'vitest';
import { lrmSplit } from './lrm';

describe('lrmSplit', () => {
  it('splits evenly with no remainder', () => {
    const result = lrmSplit(10000, ['a', 'b']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      memberId: 'a',
      amountCents: 5000,
      percentage: 50,
    });
    expect(result[1]).toEqual({
      memberId: 'b',
      amountCents: 5000,
      percentage: 50,
    });
  });

  it('distributes remainder to first N assignees', () => {
    const result = lrmSplit(10000, ['a', 'b', 'c']);
    expect(result[0].amountCents).toBe(3334);
    expect(result[1].amountCents).toBe(3333);
    expect(result[2].amountCents).toBe(3333);
    const sum = result.reduce((acc, r) => acc + r.amountCents, 0);
    expect(sum).toBe(10000);
  });

  it('returns empty array for empty memberIds', () => {
    expect(lrmSplit(10000, [])).toEqual([]);
  });

  it('single member gets full amount', () => {
    const result = lrmSplit(999, ['a']);
    expect(result).toHaveLength(1);
    expect(result[0].amountCents).toBe(999);
    expect(result[0].percentage).toBe(100);
  });

  it('percentage is a number', () => {
    const result = lrmSplit(10000, ['a', 'b']);
    expect(typeof result[0].percentage).toBe('number');
  });
});
