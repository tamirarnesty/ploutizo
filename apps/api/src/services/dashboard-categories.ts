import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
import type {
  CategoryNetSpendRow,
  NetSpendByCategory,
} from '@/lib/queries/dashboard';

const TOP_CATEGORY_COUNT = 8;

const sumAmounts = (rows: CategoryNetSpendRow[]) =>
  rows.reduce((sum, row) => sum + row.amountCents, 0);

/**
 * Every category with non-zero net spend, so the rows sum to the period's net spend; refunds can make a row
 * negative. The eight largest by absolute net are shown, highest net first; the rest become one `other` row, then
 * `uncategorised` when it is non-zero. Uncategorised never takes a top-eight slot. Shares are of positive spend
 * only (each positive category plus positive uncategorised), and rows that net to zero or less have none.
 */
export const buildOverviewCategories = (
  current: NetSpendByCategory,
  /** The prior window's net spend; null on All, which has no prior. */
  prior: NetSpendByCategory | null
): DashboardOverviewCategoryRow[] => {
  const nonZero = current.categories
    .filter((row) => row.amountCents !== 0)
    .sort((a, b) => Math.abs(b.amountCents) - Math.abs(a.amountCents));
  const top = nonZero
    .slice(0, TOP_CATEGORY_COUNT)
    .sort((a, b) => b.amountCents - a.amountCents);
  const remainder = nonZero.slice(TOP_CATEGORY_COUNT);
  const { uncategorisedCents } = current;
  const totalPositive =
    sumAmounts(nonZero.filter((row) => row.amountCents > 0)) +
    Math.max(uncategorisedCents, 0);

  const amounts = (amountCents: number, priorAmountCents: number | null) => ({
    amountCents,
    shareOfPeriod: amountCents > 0 ? amountCents / totalPositive : null,
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

  if (uncategorisedCents !== 0) {
    rows.push({
      kind: 'uncategorised',
      ...amounts(uncategorisedCents, prior && prior.uncategorisedCents),
    });
  }

  return rows;
};
