import { describe, expect, it } from 'vitest';
import {
  formatCategoryChangeVsPrior,
  formatCategoryShare,
  hasCategorySpend,
  toSpendByCategoryChartData,
} from '@/components/dashboard/spend-by-category/spendByCategoryChartUtils';

describe('formatCategoryShare', () => {
  it('formats fractional share as a whole percent', () => {
    expect(formatCategoryShare(0.375)).toMatch(/38%/);
  });
});

describe('formatCategoryChangeVsPrior', () => {
  it('returns null when there is no prior window', () => {
    expect(formatCategoryChangeVsPrior(500, null)).toBeNull();
  });

  it('describes no change when prior equals current', () => {
    expect(formatCategoryChangeVsPrior(500, 500)).toBe('No change vs prior');
  });

  it('shows signed deltas against prior', () => {
    expect(formatCategoryChangeVsPrior(600, 400)).toMatch(/^\+/);
    expect(formatCategoryChangeVsPrior(300, 500)).toMatch(/^−/);
  });
});

describe('toSpendByCategoryChartData', () => {
  it('uses a stable key for the aggregate bucket', () => {
    expect(
      toSpendByCategoryChartData([
        {
          categoryId: null,
          name: 'All other categories',
          colour: 'slate-500',
          amountCents: 100,
          shareOfPeriod: 1,
          priorAmountCents: null,
        },
      ])
    ).toEqual([
      expect.objectContaining({
        rowKey: 'other',
        name: 'All other categories',
      }),
    ]);
  });
});

describe('hasCategorySpend', () => {
  it('is false for an empty list', () => {
    expect(hasCategorySpend([])).toBe(false);
  });
});
