import type {
  ColourToken,
  DashboardOverviewCategoryRow,
} from '@ploutizo/validators';
import type { CategoryNetSpendRow } from '@/lib/queries/dashboard';
import { resolveCategoryColour } from '@/lib/category-colour';

const TOP_CATEGORY_COUNT = 8;

/** Distinct from the household default category named "Other". */
const OTHER_BUCKET_NAME = 'All other categories';

/** Neutral bar colour for the aggregated Other bucket. */
const OTHER_BUCKET_COLOUR: ColourToken = 'slate-500';

const sumAmounts = (rows: CategoryNetSpendRow[]) =>
  rows.reduce((sum, row) => sum + row.amountCents, 0);

export const buildOverviewCategories = (
  current: CategoryNetSpendRow[],
  priorByCategoryId: Map<string, number> | null
): DashboardOverviewCategoryRow[] => {
  const positive = current
    .filter((row) => row.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents);
  const totalPositive = sumAmounts(positive);
  const top = positive.slice(0, TOP_CATEGORY_COUNT);
  const remainder = positive.slice(TOP_CATEGORY_COUNT);

  const priorAmountFor = (rows: CategoryNetSpendRow[]) =>
    priorByCategoryId &&
    rows.reduce(
      (sum, row) => sum + (priorByCategoryId.get(row.categoryId) ?? 0),
      0
    );

  const rows: DashboardOverviewCategoryRow[] = top.map((row) => ({
    categoryId: row.categoryId,
    name: row.name,
    colour: resolveCategoryColour(row.configuredColour, row.categoryId),
    amountCents: row.amountCents,
    shareOfPeriod: row.amountCents / totalPositive,
    priorAmountCents: priorAmountFor([row]),
  }));

  if (remainder.length > 0) {
    const amountCents = sumAmounts(remainder);
    rows.push({
      categoryId: null,
      name: OTHER_BUCKET_NAME,
      colour: OTHER_BUCKET_COLOUR,
      amountCents,
      shareOfPeriod: amountCents / totalPositive,
      priorAmountCents: priorAmountFor(remainder),
    });
  }

  return rows;
};
