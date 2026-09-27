import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@ploutizo/db';
import { transactions } from '@ploutizo/db/schema';
import type { DashboardOverviewBucket } from '@ploutizo/types';
import type { DbClient } from '@ploutizo/db';

const netSpendAmountSql = sql<number>`coalesce(sum(
  case
    when ${transactions.type} = 'expense' then ${transactions.amount}
    when ${transactions.type} = 'refund' then -${transactions.amount}
    else 0
  end
), 0)::bigint`.mapWith(Number);

// Text, not `date`: pg parses `date` into a local-midnight JS Date, which shifts the day off UTC.
const bucketStartSql = (bucket: DashboardOverviewBucket) =>
  bucket === 'day'
    ? sql<string>`to_char(${transactions.date}, 'YYYY-MM-DD')`
    : sql<string>`to_char(${transactions.date}, 'YYYY-MM-01')`;

const spendFilter = (orgId: string) =>
  and(
    eq(transactions.orgId, orgId),
    isNull(transactions.deletedAt),
    sql`${transactions.type} in ('expense', 'refund')`
  );

export type SpendTrendBucketRow = {
  bucketStart: string;
  amountCents: number;
};

export const fetchNetSpendByBucket = async (
  orgId: string,
  bucket: DashboardOverviewBucket,
  input: { from?: string; to?: string },
  client: DbClient = db
): Promise<SpendTrendBucketRow[]> => {
  const bucketStart = bucketStartSql(bucket).as('bucket_start');
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
