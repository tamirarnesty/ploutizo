import { db } from '@ploutizo/db';
import {
  transactionAssignees,
  transactionTags,
  transactions,
} from '@ploutizo/db/schema';
import {
  buildListQuery,
  countQuery,
  counterpartAccountBelongsToOrg,
  enrichTransactions,
  fetchTransactionById,
  refundOfExists,
  replaceAssignees,
  replaceTags,
  restoreTransactionQuery,
  softDeleteTransactionQuery,
  updateTransactionScalarsQuery,
} from '../lib/queries/transactions';
import type { ListQueryParams } from '../lib/queries/transactions';
import type {
  CreateTransactionInput,
  createTransactionSchema,
} from '@ploutizo/validators';
import type { z } from 'zod';

export type { ListQueryParams };

// D-11: validate that sum of assignee amountCents equals transaction amount
export function validateSplitSum(
  amount: number,
  assignees?: { amountCents: number }[]
): string | null {
  if (!assignees || assignees.length === 0) return null;
  const sum = assignees.reduce((acc, a) => acc + a.amountCents, 0);
  return sum === amount
    ? null
    : 'Assignee amounts must sum to transaction amount';
}

// D-13: check that the refundOf transaction belongs to the same org
export async function checkRefundOfOwnership(
  refundOfId: string,
  orgId: string
): Promise<boolean> {
  return refundOfExists(refundOfId, orgId);
}

// T-03.4.1-T1: check that counterpartAccountId belongs to the same org
export async function checkCounterpartAccountOwnership(
  accountId: string,
  orgId: string
): Promise<boolean> {
  return counterpartAccountBelongsToOrg(accountId, orgId);
}

// POST: create a transaction with optional assignees and tags in a single DB transaction
export async function createTransaction(
  orgId: string,
  data: z.infer<typeof createTransactionSchema>
) {
  const { assignees, tagIds, ...transactionData } = data;

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(transactions)
      .values({ orgId, ...transactionData })
      .returning();

    // D-02: assignees optional — if omitted, no rows written
    if (assignees && assignees.length > 0) {
      await tx.insert(transactionAssignees).values(
        assignees.map((a) => ({
          transactionId: inserted.id,
          memberId: a.memberId,
          amountCents: a.amountCents,
          // percentage column is numeric — Drizzle expects string
          percentage: a.percentage != null ? a.percentage.toString() : null,
        }))
      );
    }

    if (tagIds && tagIds.length > 0) {
      await tx
        .insert(transactionTags)
        .values(tagIds.map((tagId) => ({ transactionId: inserted.id, tagId })));
    }

    return inserted;
  });
}

// GET /: paginated list with filtering, sort, joined response
export async function listTransactions(params: ListQueryParams) {
  const [baseRows, total] = await Promise.all([
    buildListQuery(params),
    countQuery(params),
  ]);
  const { assigneeMap, tagMap } = await enrichTransactions(baseRows);
  const data = baseRows.map((row) => ({
    ...row,
    assignees: assigneeMap[row.id] ?? [],
    tags: tagMap[row.id] ?? [],
  }));
  return { data, total, page: params.page, limit: params.limit };
}

// GET /:id: single transaction with joined response or null if not found
export async function getTransaction(id: string, orgId: string) {
  const row = await fetchTransactionById(id, orgId);
  if (!row) return null;
  const { assigneeMap, tagMap } = await enrichTransactions([row]);
  return {
    ...row,
    assignees: assigneeMap[row.id] ?? [],
    tags: tagMap[row.id] ?? [],
  };
}

// PATCH: update scalar fields + replace-all assignees/tags in a single DB transaction
// Accepts createTransactionSchema (discriminated union) — D-08 requires full type enforcement on PATCH.
// Returns updated row or null (not found / wrong org / already deleted — Pitfall 7)
export async function updateTransaction(
  id: string,
  orgId: string,
  data: CreateTransactionInput
) {
  // D-11: re-validate split sum if assignees are being replaced.
  if (data.assignees && data.assignees.length > 0) {
    const splitError = validateSplitSum(data.amount, data.assignees);
    if (splitError) throw new Error(splitError);
  }

  const { assignees, tagIds, ...updateData } = data;

  // WR-01: when type changes, explicitly null FK columns that do not apply to the new type.
  // Without this, switching from transfer → expense leaves counterpartAccountId in the DB
  // and the table renders "A → B" for what is now an expense row.
  const typeSpecificNulls: Record<string, null> = {};
  if (!['transfer', 'settlement', 'contribution'].includes(data.type)) {
    typeSpecificNulls.counterpartAccountId = null;
  }
  if (data.type !== 'refund') {
    typeSpecificNulls.refundOf = null;
  }
  if (data.type !== 'income') {
    typeSpecificNulls.incomeType = null;
  }
  if (!['expense', 'refund'].includes(data.type)) {
    typeSpecificNulls.categoryId = null;
  }
  Object.assign(updateData, typeSpecificNulls);

  return db.transaction(async (tx) => {
    // Delegate scalar UPDATE to query layer (Pitfall 7: three-condition WHERE)
    const updated = await updateTransactionScalarsQuery(
      tx,
      id,
      orgId,
      updateData as Record<string, unknown>
    );

    if (!updated) return null;

    // D-03: replace-all assignees if provided in payload — delegated to query layer
    if (assignees !== undefined) {
      await replaceAssignees(tx, id, assignees);
    }

    // Replace-all tags if provided — delegated to query layer
    if (tagIds !== undefined) {
      await replaceTags(tx, id, tagIds);
    }

    return updated;
  });
}

// DELETE: soft-delete — delegates to query layer (D-15)
// Returns {id} on success or null if not found/wrong org/already deleted
export async function deleteTransaction(
  id: string,
  orgId: string
): Promise<{ id: string } | null> {
  return softDeleteTransactionQuery(id, orgId);
}

// PATCH /:id/restore: undo soft-delete — delegates to query layer (D-15)
// Returns {id} on success or null if not found/wrong org/already active (T-03.3-05)
export async function restoreTransaction(
  id: string,
  orgId: string
): Promise<{ id: string } | null> {
  return restoreTransactionQuery(id, orgId);
}
