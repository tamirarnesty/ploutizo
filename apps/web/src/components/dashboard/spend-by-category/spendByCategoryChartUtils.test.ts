import { describe, expect, it } from 'vitest';
import {
  formatCategoryChangeVsPrior,
  formatCategoryShare,
  formatCategorySummary,
  toSpendByCategoryChartRows,
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

describe('toSpendByCategoryChartRows', () => {
  const amounts = { shareOfPeriod: 0.25, priorAmountCents: 900 };
  const rows = toSpendByCategoryChartRows(
    [
      {
        kind: 'category',
        categoryId: 'cat_transport',
        name: 'Transport',
        colour: 'blue-500',
        amountCents: 12000,
        ...amounts,
      },
      { kind: 'other', categoryCount: 3, amountCents: 1800, ...amounts },
      { kind: 'uncategorised', amountCents: 700, ...amounts },
    ],
    'url(#hatch)'
  );

  it('labels and keys categories by their own name and id', () => {
    expect(rows[0]).toEqual({
      key: 'cat_transport',
      label: 'Transport',
      barFill: 'var(--color-blue-500)',
      current: 12000,
      prior: 900,
      shareOfPeriod: 0.25,
    });
  });

  it('names the synthetic rows and keys them by kind', () => {
    expect(rows.slice(1).map(({ key, label }) => ({ key, label }))).toEqual([
      { key: 'other', label: 'All other categories' },
      { key: 'uncategorised', label: 'Uncategorised' },
    ]);
  });

  it('paints other a solid theme neutral and uncategorised with the hatch', () => {
    expect(rows.slice(1).map((row) => row.barFill)).toEqual([
      'var(--muted-foreground)',
      'url(#hatch)',
    ]);
  });

  it('keeps a null prior on All', () => {
    const [row] = toSpendByCategoryChartRows(
      [
        {
          kind: 'uncategorised',
          amountCents: 700,
          shareOfPeriod: 1,
          priorAmountCents: null,
        },
      ],
      'url(#hatch)'
    );
    expect(row).toMatchObject({ current: 700, prior: null });
  });
});

describe('formatCategorySummary', () => {
  const row = {
    key: 'uncategorised',
    label: 'Uncategorised',
    barFill: 'url(#hatch)',
    current: 600,
    prior: 400,
    shareOfPeriod: 0.375,
  };

  it('joins the share of spend and the change vs prior', () => {
    expect(formatCategorySummary(row)).toMatch(
      /^38% of spend · \+.+ vs prior$/
    );
  });

  it('shows only the share without a prior window', () => {
    expect(formatCategorySummary({ ...row, prior: null })).toMatch(
      /^38% of spend$/
    );
  });

  it('shows only the change vs prior for a row refunds exceed, which has no share', () => {
    expect(
      formatCategorySummary({
        ...row,
        current: -2000,
        prior: 500,
        shareOfPeriod: null,
      })
    ).toMatch(/^−.+ vs prior$/);
  });
});
