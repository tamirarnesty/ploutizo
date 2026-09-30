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

  it('shows categories whose refunds exceed spend after the positive ones, with no share', () => {
    const result = buildOverviewCategories(
      {
        categories: [category(0, -200), category(1, 300), category(2, 0)],
        uncategorisedCents: 0,
      },
      null
    );

    expect(
      result.map((row) => ({
        kind: row.kind,
        amountCents: row.amountCents,
        shareOfPeriod: row.shareOfPeriod,
      }))
    ).toEqual([
      { kind: 'category', amountCents: 300, shareOfPeriod: 1 },
      { kind: 'category', amountCents: -200, shareOfPeriod: null },
    ]);
  });

  it('ranks the top eight by absolute net, so a large refund outranks small spend', () => {
    const result = buildOverviewCategories(
      {
        categories: [...nineCategories, category(9, -5000)],
        uncategorisedCents: 0,
      },
      null
    );

    expect(
      result.map((row) => (row.kind === 'category' ? row.categoryId : row.kind))
    ).toEqual([
      'cat_0',
      'cat_1',
      'cat_2',
      'cat_3',
      'cat_4',
      'cat_5',
      'cat_6',
      'cat_9',
      'other',
    ]);
    expect(result.at(-1)).toMatchObject({
      kind: 'other',
      categoryCount: 2,
      amountCents: 300,
      shareOfPeriod: 300 / 4500,
    });
  });

  it('nets other across its categories, with no share when it nets below zero', () => {
    const result = buildOverviewCategories(
      {
        categories: [
          ...Array.from({ length: 8 }, (_, index) => category(index, 1000)),
          category(8, 100),
          category(9, -300),
        ],
        uncategorisedCents: 0,
      },
      null
    );

    expect(result.at(-1)).toEqual({
      kind: 'other',
      categoryCount: 2,
      amountCents: -200,
      shareOfPeriod: null,
      priorAmountCents: null,
    });
    // The positive category inside other still counts towards everyone's share.
    expect(result.at(0)?.shareOfPeriod).toBe(1000 / 8100);
  });

  it('shows uncategorised last when refunds exceed its spend, with no share', () => {
    const result = buildOverviewCategories(
      { categories: [category(0, 300)], uncategorisedCents: -200 },
      null
    );

    expect(result).toEqual([
      expect.objectContaining({ kind: 'category', shareOfPeriod: 1 }),
      expect.objectContaining({
        kind: 'uncategorised',
        amountCents: -200,
        shareOfPeriod: null,
      }),
    ]);
  });

  it('sums rows to the period’s net spend', () => {
    const categories = [...nineCategories, category(9, -5000)];
    const result = buildOverviewCategories(
      { categories, uncategorisedCents: -150 },
      null
    );

    expect(result.reduce((sum, row) => sum + row.amountCents, 0)).toBe(
      categories.reduce((sum, row) => sum + row.amountCents, 0) - 150
    );
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
