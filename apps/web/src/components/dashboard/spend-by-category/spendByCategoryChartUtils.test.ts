import { describe, expect, it } from 'vitest';
import {
  formatCategoryChangeVsPrior,
  formatCategoryShare,
  toCategoryTooltipItems,
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

describe('toCategoryTooltipItems', () => {
  const row = {
    categoryId: 'c1',
    name: 'Transport',
    colour: 'blue-500',
    amountCents: 12000,
    shareOfPeriod: 0.65,
    priorAmountCents: 1800,
  } as const;

  it('lists this period then prior period, each with a dot colour', () => {
    expect(toCategoryTooltipItems(row)).toEqual([
      expect.objectContaining({
        name: 'This period',
        value: 12000,
        color: 'var(--color-blue-500)',
      }),
      expect.objectContaining({ name: 'Prior period', value: 1800 }),
    ]);
  });

  it('has only this period when there is no prior window', () => {
    expect(
      toCategoryTooltipItems({ ...row, priorAmountCents: null }).map(
        (item) => item.name
      )
    ).toEqual(['This period']);
  });
});
