import { db } from '@ploutizo/db';
import { transactions } from '@ploutizo/db/schema';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import type { DbClient } from '@ploutizo/db';
import type { ImportMatchTargetTransaction } from '@ploutizo/utils';

/**
 * Load match/refund suggestion targets for the destination card.
 * Active rows on the account are included; extra ids (saved decisions) are
 * loaded even when soft-deleted so invalidated matches stay explainable.
 */
export const listImportMatchTargets = async (
  orgId: string,
  accountId: string,
  extraIds: readonly string[] = [],
  client: DbClient = db
): Promise<Map<string, ImportMatchTargetTransaction>> => {
  const result = new Map<string, ImportMatchTargetTransaction>();
  const uniqueExtraIds = [...new Set(extraIds.filter(Boolean))];

  const rows = await client
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      type: transactions.type,
      date: transactions.date,
      amount: transactions.amount,
      description: transactions.description,
      rawDescription: transactions.rawDescription,
      externalId: transactions.externalId,
      deletedAt: transactions.deletedAt,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.orgId, orgId),
        uniqueExtraIds.length > 0
          ? or(
              and(
                eq(transactions.accountId, accountId),
                isNull(transactions.deletedAt)
              ),
              inArray(transactions.id, uniqueExtraIds)
            )
          : and(
              eq(transactions.accountId, accountId),
              isNull(transactions.deletedAt)
            )
      )
    );

  for (const row of rows) {
    result.set(row.id, {
      id: row.id,
      accountId: row.accountId,
      type: row.type,
      date: row.date,
      amount: row.amount,
      description: row.description,
      rawDescription: row.rawDescription,
      externalId: row.externalId,
      deleted: row.deletedAt != null,
    });
  }

  return result;
};
