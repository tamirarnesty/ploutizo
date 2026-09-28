import { and, gte, lte, sql } from 'drizzle-orm';
import { db } from '@ploutizo/db';
import { transactions } from '@ploutizo/db/schema';
import type { DashboardOverviewGrain } from '@ploutizo/types';
import type { DbClient } from '@ploutizo/db';
import type { SQL } from 'drizzle-orm';
import { activeTransactions } from '@/lib/queries/scope';

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

export type SpendTrendBucketRow = {
  bucketStart: string;
  amountCents: number;
};

export const fetchNetSpendByBucket = async (
  orgId: string,
  grain: DashboardOverviewGrain,
  input: { from?: string; to?: string },
  client: DbClient = db
): Promise<SpendTrendBucketRow[]> => {
  const bucketStart = BUCKET_START_SQL[grain].as('bucket_start');
  return client
    .select({
      bucketStart,
      amountCents: netSpendAmountSql.as('amount_cents'),
    })
    .from(transactions)
    .where(
      and(
        spendFilter(orgId),
        input.from ? gte(transactions.date, input.from) : undefined,
        input.to ? lte(transactions.date, input.to) : undefined
      )
    )
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
