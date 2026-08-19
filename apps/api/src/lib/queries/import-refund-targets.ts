import { db } from '@ploutizo/db';
import { transactionAssignees, transactions } from '@ploutizo/db/schema';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { DbClient } from '@ploutizo/db';
import type { ExistingRefundTargetExpense } from '@ploutizo/utils';

/**
 * Load transaction targets for import refund-link validation by id.
 * Includes soft-deleted and non-expense rows so invalid saved links stay visible.
 */
export const listRefundTargetExpensesByIds = async (
  orgId: string,
  transactionIds: string[],
  client: DbClient = db
): Promise<Map<string, ExistingRefundTargetExpense>> => {
  const result = new Map<string, ExistingRefundTargetExpense>();
  if (transactionIds.length === 0) return result;

  const uniqueIds = [...new Set(transactionIds)];
  const rows = await client
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      deletedAt: transactions.deletedAt,
      type: transactions.type,
    })
    .from(transactions)
    .where(
      and(eq(transactions.orgId, orgId), inArray(transactions.id, uniqueIds))
    );

  const ids = rows.map((row) => row.id);
  const assigneeRows =
    ids.length === 0
      ? []
      : await client
          .select({
            transactionId: transactionAssignees.transactionId,
            memberId: transactionAssignees.memberId,
          })
          .from(transactionAssignees)
          .where(inArray(transactionAssignees.transactionId, ids));

  const assigneesByTx = new Map<string, string[]>();
  for (const row of assigneeRows) {
    const list = assigneesByTx.get(row.transactionId) ?? [];
    list.push(row.memberId);
    assigneesByTx.set(row.transactionId, list);
  }

  for (const row of rows) {
    result.set(row.id, {
      id: row.id,
      accountId: row.accountId,
      amount: row.amount,
      categoryId: row.categoryId,
      assigneeMemberIds: assigneesByTx.get(row.id) ?? [],
      type: row.type,
      deleted: row.deletedAt != null,
    });
  }

  return result;
};

/**
 * Sum finalized refund amounts per existing-expense target (`tx:${id}` keys).
 * Used at Continue to enforce cross-import cumulative refund caps.
 */
export const sumPriorRefundTotalsByTransactionTarget = async (
  orgId: string,
  transactionIds: string[],
  client: DbClient = db
): Promise<Map<string, number>> => {
  const totals = new Map<string, number>();
  if (transactionIds.length === 0) return totals;

  const uniqueIds = [...new Set(transactionIds)];
  const rows = await client
    .select({
      refundOf: transactions.refundOf,
      total: sql<number>`sum(abs(${transactions.amount}))`.mapWith(Number),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.orgId, orgId),
        eq(transactions.type, 'refund'),
        inArray(transactions.refundOf, uniqueIds),
        isNull(transactions.deletedAt)
      )
    )
    .groupBy(transactions.refundOf);

  for (const row of rows) {
    if (!row.refundOf) continue;
    totals.set(`tx:${row.refundOf}`, row.total);
  }

  return totals;
};
