import { describe, expect, it } from 'vitest';
import {
  spendTrendHasPriorSeries,
  spendTrendYDomain,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';

describe('spendTrendHasPriorSeries', () => {
  it('is false when every prior value is null (no prior series)', () => {
    expect(
      spendTrendHasPriorSeries([
        { bucketStart: '2026-03-01', current: 100, prior: null },
        { bucketStart: '2026-03-02', current: 200, prior: null },
      ])
    ).toBe(false);
  });

  it('is true when any bucket has prior data', () => {
    expect(
      spendTrendHasPriorSeries([
        { bucketStart: '2026-03-01', current: 100, prior: null },
        { bucketStart: '2026-03-02', current: 200, prior: 50 },
      ])
    ).toBe(true);
  });
});

describe('spendTrendYDomain', () => {
  it('returns a non-degenerate domain for empty or all-zero data', () => {
    expect(spendTrendYDomain([])).toEqual([-1, 1]);
    expect(
      spendTrendYDomain([{ bucketStart: '2026-03-01', current: 0, prior: 0 }])
    ).toEqual([-1, 1]);
  });

  it('includes zero and extends below when values are negative', () => {
    const [min, max] = spendTrendYDomain([
      { bucketStart: '2026-03-01', current: -500, prior: 100 },
    ]);
    expect(min).toBeLessThanOrEqual(-500);
    expect(max).toBeGreaterThanOrEqual(0);
  });
});
