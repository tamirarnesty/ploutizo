import { db } from '@ploutizo/db';
import {
  transactionAssignees,
  transactionTags,
  transactions,
} from '@ploutizo/db/schema';
import {
  buildListQuery,
  countQuery,
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
  createTransactionSchema,
  updateTransactionSchema,
} from '@ploutizo/validators';
import type { z } from 'zod';

export type { ListQueryParams };

// D-11: validate that sum of assignee amountCents equals transaction amount
export function validateSplitSum(
  amount: number,
  assignees?: Array<{ amountCents: number }>
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
// Returns updated row or null (not found / wrong org / already deleted — Pitfall 7)
export async function updateTransaction(
  id: string,
  orgId: string,
  data: z.infer<typeof updateTransactionSchema>
) {
  // D-11: re-validate split sum if assignees are being replaced.
  // When amount is absent, fetch the stored amount to validate against.
  if (data.assignees && data.assignees.length > 0) {
    const amountToCheck =
      data.amount ?? (await fetchTransactionById(id, orgId))?.amount;
    if (amountToCheck !== undefined) {
      const splitError = validateSplitSum(amountToCheck, data.assignees);
      if (splitError) throw new Error(splitError);
    }
  }

  const { assignees, tagIds, ...updateData } = data;

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
