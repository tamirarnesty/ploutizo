import { db } from '@ploutizo/db'
import { transactions, transactionAssignees, transactionTags } from '@ploutizo/db/schema'
import { createTransactionSchema } from '@ploutizo/validators'
import type { z } from 'zod'
import {
  enrichTransactions,
  buildListQuery,
  countQuery,
  fetchTransactionById,
  refundOfExists,
  type ListQueryParams,
} from '../lib/queries/transactions'

export type { ListQueryParams }

// D-11: validate that sum of assignee amountCents equals transaction amount
export function validateSplitSum(
  amount: number,
  assignees?: Array<{ amountCents: number }>,
): string | null {
  if (!assignees || assignees.length === 0) return null
  const sum = assignees.reduce((acc, a) => acc + a.amountCents, 0)
  return sum === amount ? null : 'Assignee amounts must sum to transaction amount'
}

// D-13: check that the refundOf transaction belongs to the same org
export async function checkRefundOfOwnership(
  refundOfId: string,
  orgId: string,
): Promise<boolean> {
  return refundOfExists(refundOfId, orgId)
}

// POST: create a transaction with optional assignees and tags in a single DB transaction
export async function createTransaction(
  orgId: string,
  data: z.infer<typeof createTransactionSchema>,
) {
  const { assignees, tagIds, ...transactionData } = data

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(transactions)
      .values({ orgId, ...transactionData })
      .returning()

    // D-02: assignees optional — if omitted, no rows written
    if (assignees && assignees.length > 0) {
      await tx.insert(transactionAssignees).values(
        assignees.map((a) => ({
          transactionId: inserted.id,
          memberId: a.memberId,
          amountCents: a.amountCents,
          // percentage column is numeric — Drizzle expects string
          percentage: a.percentage != null ? a.percentage.toString() : null,
        })),
      )
    }

    if (tagIds && tagIds.length > 0) {
      await tx
        .insert(transactionTags)
        .values(tagIds.map((tagId) => ({ transactionId: inserted.id, tagId })))
    }

    return inserted
  })
}

// GET /: paginated list with filtering, sort, joined response
export async function listTransactions(params: ListQueryParams) {
  const [baseRows, total] = await Promise.all([buildListQuery(params), countQuery(params)])
  const { assigneeMap, tagMap } = await enrichTransactions(baseRows)
  const data = baseRows.map((row) => ({
    ...row,
    assignees: assigneeMap[row.id] ?? [],
    tags: tagMap[row.id] ?? [],
  }))
  return { data, total, page: params.page, limit: params.limit }
}

// GET /:id: single transaction with joined response or null if not found
export async function getTransaction(id: string, orgId: string) {
  const row = await fetchTransactionById(id, orgId)
  if (!row) return null
  const { assigneeMap, tagMap } = await enrichTransactions([row])
  return {
    ...row,
    assignees: assigneeMap[row.id] ?? [],
    tags: tagMap[row.id] ?? [],
  }
}
