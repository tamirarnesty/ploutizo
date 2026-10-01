import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
import type {
  CategoryNetSpendRow,
  NetSpendByCategory,
} from '@/lib/queries/dashboard';

const TOP_CATEGORY_COUNT = 8;

/** A row before shares, which depend on every row; distributes over the `kind` union. */
type UnsharedRow = DashboardOverviewCategoryRow extends infer Row
  ? Row extends unknown
    ? Omit<Row, 'shareOfPeriod'>
    : never
  : never;

const sumAmounts = (rows: CategoryNetSpendRow[]) =>
  rows.reduce((sum, row) => sum + row.amountCents, 0);

/**
 * Every category with non-zero net spend, so the rows sum to the period's net spend; refunds can make a row
 * negative. The eight largest by absolute net are shown, highest net first; the rest become one `other` row, then
 * `uncategorised` when it is non-zero. Uncategorised never takes a top-eight slot. Shares are of the positive rows
 * shown, so the shares on screen always sum to 1; rows that net to zero or less have none.
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
  const priorByCategoryId = new Map(
    prior?.categories.map((row) => [row.categoryId, row.amountCents])
  );
  const priorAmountFor = (rows: CategoryNetSpendRow[]) =>
    prior &&
    rows.reduce(
      (sum, row) => sum + (priorByCategoryId.get(row.categoryId) ?? 0),
      0
    );

  const rows: UnsharedRow[] = top.map((row) => ({
    kind: 'category',
    categoryId: row.categoryId,
    name: row.name,
    colour: row.colour,
    amountCents: row.amountCents,
    priorAmountCents: priorAmountFor([row]),
  }));

  if (remainder.length > 0) {
    rows.push({
      kind: 'other',
      categoryCount: remainder.length,
      amountCents: sumAmounts(remainder),
      priorAmountCents: priorAmountFor(remainder),
    });
  }

  if (uncategorisedCents !== 0) {
    rows.push({
      kind: 'uncategorised',
      amountCents: uncategorisedCents,
      priorAmountCents: prior && prior.uncategorisedCents,
    });
  }

  const totalPositive = rows.reduce(
    (sum, row) => sum + Math.max(row.amountCents, 0),
    0
  );
  return rows.map((row) => ({
    ...row,
    shareOfPeriod: row.amountCents > 0 ? row.amountCents / totalPositive : null,
  }));
};
