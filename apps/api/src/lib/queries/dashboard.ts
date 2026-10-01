import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@ploutizo/db';
import { categories, transactions } from '@ploutizo/db/schema';
import type { ColourToken, DashboardOverviewGrain } from '@ploutizo/types';
import type { DbClient } from '@ploutizo/db';
import type { SQL } from 'drizzle-orm';
import { activeTransactions, categoriesForOrg } from '@/lib/queries/scope';

const netSpendAmountSql = sql<number>`coalesce(sum(
  case
    when ${transactions.type} = 'expense' then ${transactions.amount}
    when ${transactions.type} = 'refund' then -${transactions.amount}
    else 0
  end
), 0)::bigint`.mapWith(Number);

// Text, not `date`: pg parses `date` into a local-midnight JS Date, which shifts the day off UTC.
// `date_trunc('week')` starts weeks on Monday, matching the shared bucket calendar.
const BUCKET_START_SQL: Record<DashboardOverviewGrain, SQL<string>> = {
  day: sql<string>`to_char(${transactions.date}, 'YYYY-MM-DD')`,
  week: sql<string>`to_char(date_trunc('week', ${transactions.date}), 'YYYY-MM-DD')`,
  month: sql<string>`to_char(${transactions.date}, 'YYYY-MM-01')`,
};

const spendFilter = (orgId: string) =>
  and(
    ...activeTransactions(orgId),
    sql`${transactions.type} in ('expense', 'refund')`
  );

type SpendWindow = { from?: string; to?: string };

const spendWindowFilter = (orgId: string, window: SpendWindow) =>
  and(
    spendFilter(orgId),
    window.from ? gte(transactions.date, window.from) : undefined,
    window.to ? lte(transactions.date, window.to) : undefined
  );

export type SpendTrendBucketRow = {
  bucketStart: string;
  amountCents: number;
};

export const fetchNetSpendByBucket = async (
  orgId: string,
  grain: DashboardOverviewGrain,
  window: SpendWindow,
  client: DbClient = db
): Promise<SpendTrendBucketRow[]> => {
  const bucketStart = BUCKET_START_SQL[grain].as('bucket_start');
  return client
    .select({
      bucketStart,
      amountCents: netSpendAmountSql.as('amount_cents'),
    })
    .from(transactions)
    .where(spendWindowFilter(orgId, window))
    .groupBy(bucketStart)
    .orderBy(bucketStart);
};

/** First and last day with spend; both null when there is none. */
export const fetchSpendDateBounds = async (
  orgId: string,
  client: DbClient = db
): Promise<{ first: string | null; last: string | null }> => {
  const [bounds] = await client
    .select({
      first: sql<
        string | null
      >`to_char(min(${transactions.date}), 'YYYY-MM-DD')`,
      last: sql<
        string | null
      >`to_char(max(${transactions.date}), 'YYYY-MM-DD')`,
    })
    .from(transactions)
    .where(spendFilter(orgId));
  return bounds;
};

export type CategoryNetSpendRow = {
  categoryId: string;
  name: string;
  colour: ColourToken;
  amountCents: number;
};

export type NetSpendByCategory = {
  categories: CategoryNetSpendRow[];
  /** Net spend on transactions with no category. */
  uncategorisedCents: number;
};

/** Net spend per category, plus the net spend with no category, in one grouped query. */
export const fetchNetSpendByCategory = async (
  orgId: string,
  window: SpendWindow,
  client: DbClient = db
): Promise<NetSpendByCategory> => {
  const rows = await client
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      colour: categories.colour,
      amountCents: netSpendAmountSql.as('amount_cents'),
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(
        eq(categories.id, transactions.categoryId),
        ...categoriesForOrg(orgId)
      )
    )
    .where(spendWindowFilter(orgId, window))
    .groupBy(transactions.categoryId, categories.name, categories.colour);

  const result: NetSpendByCategory = { categories: [], uncategorisedCents: 0 };
  for (const { categoryId, name, colour, amountCents } of rows) {
    if (categoryId !== null && name !== null && colour !== null) {
      result.categories.push({ categoryId, name, colour, amountCents });
    } else {
      // No category, or one outside the org (the join finds nothing): spend still counts, as uncategorised.
      result.uncategorisedCents += amountCents;
    }
  }
  return result;
};
