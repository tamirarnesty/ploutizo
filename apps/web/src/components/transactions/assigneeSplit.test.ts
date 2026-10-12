import { describe, expect, it } from 'vitest';
import {
  formAmountToCents,
  rescaleAssigneesForAmount,
  splitAssigneesEvenly,
} from './assigneeSplit';

describe('formAmountToCents', () => {
  it('treats an unset or non-finite amount as zero', () => {
    expect(formAmountToCents(undefined)).toBe(0);
    expect(formAmountToCents(Number.NaN)).toBe(0);
    expect(formAmountToCents(12.34)).toBe(1234);
  });
});

describe('splitAssigneesEvenly', () => {
  it('splits zero cents when the amount is unset', () => {
    expect(splitAssigneesEvenly(-5, ['a', 'b'])).toEqual([
      { memberId: 'a', amountCents: 0, percentage: 50 },
      { memberId: 'b', amountCents: 0, percentage: 50 },
    ]);
  });
});

describe('rescaleAssigneesForAmount', () => {
  it('keeps an empty split empty', () => {
    const empty: never[] = [];
    expect(rescaleAssigneesForAmount(empty, 1000)).toBe(empty);
  });

  it('re-evens an even split for the new amount', () => {
    const current = splitAssigneesEvenly(10000, ['a', 'b']);
    expect(rescaleAssigneesForAmount(current, 20001)).toEqual([
      { memberId: 'a', amountCents: 10001, percentage: 50 },
      { memberId: 'b', amountCents: 10000, percentage: 50 },
    ]);
  });

  it('scales a customized split proportionally', () => {
    const current = [
      { memberId: 'a', amountCents: 6000, percentage: 60 },
      { memberId: 'b', amountCents: 4000, percentage: 40 },
    ];
    expect(rescaleAssigneesForAmount(current, 20000)).toEqual([
      { memberId: 'a', amountCents: 12000, percentage: 60 },
      { memberId: 'b', amountCents: 8000, percentage: 40 },
    ]);
  });

  it('keeps percentages at a zero amount so proportions come back later', () => {
    const current = [
      { memberId: 'a', amountCents: 6000, percentage: 60 },
      { memberId: 'b', amountCents: 4000, percentage: 40 },
    ];
    const zeroed = rescaleAssigneesForAmount(current, 0);
    expect(zeroed).toEqual([
      { memberId: 'a', amountCents: 0, percentage: 60 },
      { memberId: 'b', amountCents: 0, percentage: 40 },
    ]);
    expect(rescaleAssigneesForAmount(zeroed, 5000)).toEqual([
      { memberId: 'a', amountCents: 3000, percentage: 60 },
      { memberId: 'b', amountCents: 2000, percentage: 40 },
    ]);
  });

  it('returns the same reference when nothing changes', () => {
    const current = splitAssigneesEvenly(10000, ['a', 'b']);
    expect(rescaleAssigneesForAmount(current, 10000)).toBe(current);
  });
});
