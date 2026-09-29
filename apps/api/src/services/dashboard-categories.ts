import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
import type { CategoryNetSpendRow } from '@/lib/queries/dashboard-types';
import {
  OTHER_CATEGORY_COLOUR,
  resolveCategoryColour,
} from '@/lib/category-colour';

/** Distinct from the household default category named "Other". */
const OTHER_BUCKET_NAME = 'All other categories';

export const buildOverviewCategories = (
  current: CategoryNetSpendRow[],
  priorByCategoryId: Map<string, number> | null
): DashboardOverviewCategoryRow[] => {
  const positive = current
    .filter((row) => row.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents);

  const totalPositive = positive.reduce((sum, row) => sum + row.amountCents, 0);
  if (totalPositive === 0) {
    return [];
  }

  const top = positive.slice(0, 8);
  const remainder = positive.slice(8);

  const priorFor = (categoryId: string) =>
    priorByCategoryId?.get(categoryId) ?? 0;

  const rows: DashboardOverviewCategoryRow[] = top.map((row) => ({
    categoryId: row.categoryId,
    name: row.name,
    colour: resolveCategoryColour(row.configuredColour, row.categoryId),
    amountCents: row.amountCents,
    shareOfPeriod: row.amountCents / totalPositive,
    priorAmountCents:
      priorByCategoryId === null ? null : priorFor(row.categoryId),
  }));

  if (remainder.length > 0) {
    const amountCents = remainder.reduce(
      (sum, row) => sum + row.amountCents,
      0
    );
    rows.push({
      categoryId: null,
      name: OTHER_BUCKET_NAME,
      colour: OTHER_CATEGORY_COLOUR,
      amountCents,
      shareOfPeriod: amountCents / totalPositive,
      priorAmountCents:
        priorByCategoryId === null
          ? null
          : remainder.reduce((sum, row) => sum + priorFor(row.categoryId), 0),
    });
  }

  return rows;
};
