import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@ploutizo/db';
import { transactions } from '@ploutizo/db/schema';
import type { DbClient } from '@ploutizo/db';
import type { PeriodGrain } from '@ploutizo/utils/dashboard-period';

const netSpendAmountSql = sql<number>`coalesce(sum(
  case
    when ${transactions.type} = 'expense' then ${transactions.amount}
    when ${transactions.type} = 'refund' then -${transactions.amount}
    else 0
  end
), 0)::int`;

const spendTypesFilter = sql`${transactions.type} in ('expense', 'refund')`;

const bucketExpression = (grain: PeriodGrain) => {
  switch (grain) {
    case 'daily':
      return sql<Date>`${transactions.date}::date`.as('bucket_start');
    case 'weekly':
      return sql<Date>`date_trunc('week', ${transactions.date}::timestamp)::date`.as(
        'bucket_start'
      );
    case 'monthly':
      return sql<Date>`date_trunc('month', ${transactions.date}::timestamp)::date`.as(
        'bucket_start'
      );
  }
};

export type SpendTrendBucketRow = {
  bucketStart: string;
  amountCents: number;
};

const toBucketStart = (value: Date | string): string => {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
};

export const fetchSpendTrendBuckets = async (
  orgId: string,
  input: {
    from: string;
    to: string;
    grain: PeriodGrain;
  },
  client: DbClient = db
): Promise<SpendTrendBucketRow[]> => {
  const bucketStart = bucketExpression(input.grain);
  const rows = await client
    .select({
      bucketStart,
      amountCents: netSpendAmountSql.as('amount_cents'),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.orgId, orgId),
        isNull(transactions.deletedAt),
        spendTypesFilter,
        gte(transactions.date, input.from),
        lte(transactions.date, input.to)
      )
    )
    .groupBy(bucketStart)
    .orderBy(bucketStart);

  return rows.map((row) => ({
    bucketStart: toBucketStart(row.bucketStart),
    amountCents: row.amountCents,
  }));
};

export const fetchAllTimeSpendTrendBuckets = async (
  orgId: string,
  client: DbClient = db
): Promise<SpendTrendBucketRow[]> => {
  const bucketStart = bucketExpression('monthly');
  const rows = await client
    .select({
      bucketStart,
      amountCents: netSpendAmountSql.as('amount_cents'),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.orgId, orgId),
        isNull(transactions.deletedAt),
        spendTypesFilter
      )
    )
    .groupBy(bucketStart)
    .orderBy(bucketStart);

  return rows.map((row) => ({
    bucketStart: toBucketStart(row.bucketStart),
    amountCents: row.amountCents,
  }));
};
