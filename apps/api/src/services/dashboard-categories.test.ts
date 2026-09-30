import { describe, expect, it } from 'vitest';
import { buildOverviewCategories } from '@/services/dashboard-categories';

const category = (index: number, amountCents: number) => ({
  categoryId: `cat_${index}`,
  name: `Category ${index}`,
  colour: 'blue-500' as const,
  amountCents,
});

/** Nine categories spending 900, 800, …, 100. */
const nineCategories = Array.from({ length: 9 }, (_, index) =>
  category(index, (9 - index) * 100)
);

describe('buildOverviewCategories', () => {
  it('ranks the top eight categories, then aggregates the rest into other, then uncategorised', () => {
    const result = buildOverviewCategories(
      { categories: nineCategories, uncategorisedCents: 5000 },
      null
    );

    expect(result.map((row) => row.kind)).toEqual([
      ...Array<'category'>(8).fill('category'),
      'other',
      'uncategorised',
    ]);
    expect(result.at(-2)).toEqual({
      kind: 'other',
      categoryCount: 1,
      amountCents: 100,
      shareOfPeriod: 100 / 9500,
      priorAmountCents: null,
    });
    expect(result.at(-1)).toMatchObject({
      kind: 'uncategorised',
      amountCents: 5000,
    });
  });

  it('includes uncategorised spend in the share denominator', () => {
    const result = buildOverviewCategories(
      { categories: [category(0, 300)], uncategorisedCents: 100 },
      null
    );

    expect(result.map((row) => row.shareOfPeriod)).toEqual([0.75, 0.25]);
  });

  it('leaves out uncategorised spend that nets to zero or less', () => {
    const result = buildOverviewCategories(
      { categories: [category(0, 300)], uncategorisedCents: -200 },
      null
    );

    expect(result).toEqual([
      expect.objectContaining({ kind: 'category', shareOfPeriod: 1 }),
    ]);
  });

  it('sums prior amounts per row, with the prior uncategorised net for uncategorised', () => {
    const result = buildOverviewCategories(
      { categories: nineCategories, uncategorisedCents: 50 },
      {
        categories: [category(0, 40), category(8, 70)],
        uncategorisedCents: -30,
      }
    );

    expect(
      result.map(({ kind, priorAmountCents }) => ({ kind, priorAmountCents }))
    ).toEqual([
      { kind: 'category', priorAmountCents: 40 },
      ...Array.from({ length: 7 }, () => ({
        kind: 'category',
        priorAmountCents: 0,
      })),
      { kind: 'other', priorAmountCents: 70 },
      { kind: 'uncategorised', priorAmountCents: -30 },
    ]);
  });
});
