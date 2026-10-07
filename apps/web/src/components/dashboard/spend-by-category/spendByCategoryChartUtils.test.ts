import { describe, expect, it } from 'vitest';
import { fadedColour } from '@/components/dashboard/dashboardChartColour';
import {
  formatCategoryChangeVsPrior,
  formatCategoryShare,
  formatCategorySummary,
  spendByCategoryIndicatorColor,
  toSpendByCategoryChartRows,
} from '@/components/dashboard/spend-by-category/spendByCategoryChartUtils';

const hatch = { current: 'url(#hatch)', prior: 'url(#hatch-prior)' };
const faded = fadedColour;

describe('formatCategoryShare', () => {
  it('formats fractional share as a whole percent', () => {
    expect(formatCategoryShare(0.375)).toMatch(/38%/);
  });
});

describe('formatCategoryChangeVsPrior', () => {
  it('keeps sub-dollar changes visible', () => {
    expect(formatCategoryChangeVsPrior(501, 500)).toBe('+$0.01 vs prior');
  });

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
    hatch
  );

  it('labels and keys categories by their own name and id', () => {
    expect(rows[0]).toEqual({
      key: 'cat_transport',
      label: 'Transport',
      fill: {
        current: 'var(--color-blue-500)',
        prior: faded('var(--color-blue-500)'),
      },
      indicator: {
        current: 'var(--color-blue-500)',
        prior: faded('var(--color-blue-500)'),
      },
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

  it('paints other a solid theme neutral, faded for the prior period', () => {
    expect(rows[1]?.fill).toEqual({
      current: 'var(--muted-foreground)',
      prior: faded('var(--muted-foreground)'),
    });
  });

  it('paints uncategorised with the hatch and its dots with the plain neutral', () => {
    expect(rows[2]).toMatchObject({
      fill: hatch,
      indicator: {
        current: 'var(--muted-foreground)',
        prior: faded('var(--muted-foreground)'),
      },
    });
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
      hatch
    );
    expect(row).toMatchObject({ current: 700, prior: null });
  });
});

describe('formatCategorySummary', () => {
  const row = {
    key: 'uncategorised',
    label: 'Uncategorised',
    fill: hatch,
    indicator: {
      current: 'var(--muted-foreground)',
      prior: faded('var(--muted-foreground)'),
    },
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

describe('spendByCategoryIndicatorColor', () => {
  const [row, uncategorised] = toSpendByCategoryChartRows(
    [
      {
        kind: 'category',
        categoryId: 'cat_food',
        name: 'Food',
        colour: 'green-500',
        amountCents: 500,
        shareOfPeriod: 1,
        priorAmountCents: 400,
      },
      {
        kind: 'uncategorised',
        amountCents: 100,
        shareOfPeriod: 0.2,
        priorAmountCents: 50,
      },
    ],
    hatch
  );
  const item = (dataKey: string, payload = row) => ({
    dataKey,
    payload,
    graphicalItemId: dataKey,
  });

  it("gives each bar's dot its row's colour for that period", () => {
    expect(spendByCategoryIndicatorColor(item('current'))).toBe(
      'var(--color-green-500)'
    );
    expect(spendByCategoryIndicatorColor(item('prior'))).toBe(
      faded('var(--color-green-500)')
    );
  });

  it('gives hatched bars plain neutral dots, since a pattern is no CSS colour', () => {
    expect(spendByCategoryIndicatorColor(item('current', uncategorised))).toBe(
      'var(--muted-foreground)'
    );
    expect(spendByCategoryIndicatorColor(item('prior', uncategorised))).toBe(
      faded('var(--muted-foreground)')
    );
  });
});
