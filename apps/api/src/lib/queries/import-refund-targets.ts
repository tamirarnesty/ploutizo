import { db } from '@ploutizo/db';
import { transactionAssignees, transactions } from '@ploutizo/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { ExistingRefundTargetExpense } from '@ploutizo/utils';

/**
 * Load transaction targets for import refund-link validation by id.
 * Includes soft-deleted and non-expense rows so invalid saved links stay visible.
 */
export const listRefundTargetExpensesByIds = async (
  orgId: string,
  transactionIds: string[]
): Promise<Map<string, ExistingRefundTargetExpense>> => {
  const result = new Map<string, ExistingRefundTargetExpense>();
  if (transactionIds.length === 0) return result;

  const uniqueIds = [...new Set(transactionIds)];
  const rows = await db
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
      : await db
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
