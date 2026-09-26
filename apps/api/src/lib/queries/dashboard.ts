import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@ploutizo/db';
import { transactions } from '@ploutizo/db/schema';
import type { DbClient } from '@ploutizo/db';

const netSpendAmountSql = sql<number>`coalesce(sum(
  case
    when ${transactions.type} = 'expense' then ${transactions.amount}
    when ${transactions.type} = 'refund' then -${transactions.amount}
    else 0
  end
), 0)::bigint`.mapWith(Number);

// Text, not `date`: pg parses `date` into a local-midnight JS Date, which shifts the day off UTC.
const dayBucketSql = sql<string>`to_char(${transactions.date}, 'YYYY-MM-DD')`;

export type SpendTrendBucketRow = {
  bucketStart: string;
  amountCents: number;
};

export const fetchDailyNetSpend = async (
  orgId: string,
  input: { from?: string; to?: string },
  client: DbClient = db
): Promise<SpendTrendBucketRow[]> => {
  const bucketStart = dayBucketSql.as('bucket_start');
  const dateFilters = [
    input.from ? gte(transactions.date, input.from) : undefined,
    input.to ? lte(transactions.date, input.to) : undefined,
  ].filter(
    (filter): filter is NonNullable<typeof filter> => filter !== undefined
  );

  return client
    .select({
      bucketStart,
      amountCents: netSpendAmountSql.as('amount_cents'),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.orgId, orgId),
        isNull(transactions.deletedAt),
        sql`${transactions.type} in ('expense', 'refund')`,
        ...dateFilters
      )
    )
    .groupBy(bucketStart)
    .orderBy(bucketStart);
};
