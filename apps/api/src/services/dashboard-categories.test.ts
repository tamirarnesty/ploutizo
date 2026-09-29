import { describe, expect, it } from 'vitest';
import { buildOverviewCategories } from '@/services/dashboard-categories';

describe('buildOverviewCategories', () => {
  it('aggregates categories beyond the top eight into Other', () => {
    const rows = Array.from({ length: 9 }, (_, index) => ({
      categoryId: `cat_${index}`,
      name: `Category ${index}`,
      configuredColour: null,
      amountCents: (9 - index) * 100,
    }));

    const result = buildOverviewCategories(rows, new Map());
    expect(result).toHaveLength(9);
    expect(result.at(-1)).toMatchObject({
      categoryId: null,
      name: 'Other',
      amountCents: 100,
    });
  });
});
