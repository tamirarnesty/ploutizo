import { describe, expect, it } from 'vitest';
import { amountDomain } from '@/components/dashboard/dashboardChartDomain';

describe('amountDomain', () => {
  it('returns a non-degenerate domain for empty or all-zero data', () => {
    expect(amountDomain([])).toEqual([-1, 1]);
    expect(amountDomain([0, 0])).toEqual([-1, 1]);
  });

  it('starts at zero when every value is positive', () => {
    expect(amountDomain([300, 1200])).toEqual([0, 1200]);
  });

  it('extends below zero to the most negative value', () => {
    expect(amountDomain([-500, 100])).toEqual([-500, 100]);
  });

  it('ends at zero when every value is negative', () => {
    expect(amountDomain([-500, -100])).toEqual([-500, 0]);
  });

  it('ignores absent values', () => {
    expect(amountDomain([null, 400, null])).toEqual([0, 400]);
  });
});
