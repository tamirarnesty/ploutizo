import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
import type {
  CategoryNetSpendRow,
  NetSpendByCategory,
} from '@/lib/queries/dashboard';

const TOP_CATEGORY_COUNT = 8;

const sumAmounts = (rows: CategoryNetSpendRow[]) =>
  rows.reduce((sum, row) => sum + row.amountCents, 0);

/**
 * Top eight categories by positive net spend, then the rest as one `other` row, then `uncategorised` when it is
 * positive. Uncategorised never takes a top-eight slot. Shares are of all positive spend on screen, so they sum
 * to 1.
 */
export const buildOverviewCategories = (
  current: NetSpendByCategory,
  /** The prior window's net spend; null on All, which has no prior. */
  prior: NetSpendByCategory | null
): DashboardOverviewCategoryRow[] => {
  const positive = current.categories
    .filter((row) => row.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents);
  const uncategorisedCents = Math.max(current.uncategorisedCents, 0);
  const totalPositive = sumAmounts(positive) + uncategorisedCents;
  const top = positive.slice(0, TOP_CATEGORY_COUNT);
  const remainder = positive.slice(TOP_CATEGORY_COUNT);

  const amounts = (amountCents: number, priorAmountCents: number | null) => ({
    amountCents,
    shareOfPeriod: amountCents / totalPositive,
    priorAmountCents,
  });
  const priorByCategoryId = new Map(
    prior?.categories.map((row) => [row.categoryId, row.amountCents])
  );
  const priorAmountFor = (rows: CategoryNetSpendRow[]) =>
    prior &&
    rows.reduce(
      (sum, row) => sum + (priorByCategoryId.get(row.categoryId) ?? 0),
      0
    );

  const rows: DashboardOverviewCategoryRow[] = top.map((row) => ({
    kind: 'category',
    categoryId: row.categoryId,
    name: row.name,
    colour: row.colour,
    ...amounts(row.amountCents, priorAmountFor([row])),
  }));

  if (remainder.length > 0) {
    rows.push({
      kind: 'other',
      categoryCount: remainder.length,
      ...amounts(sumAmounts(remainder), priorAmountFor(remainder)),
    });
  }

  if (uncategorisedCents > 0) {
    rows.push({
      kind: 'uncategorised',
      ...amounts(uncategorisedCents, prior && prior.uncategorisedCents),
    });
  }

  return rows;
};
