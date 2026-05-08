import { db } from '@ploutizo/db'
import {
  accounts,
  orgMembers,
  transactionAssignees,
  transactions,
  users,
} from '@ploutizo/db/schema'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'

export interface SettlementBalanceRow {
  accountId: string
  accountName: string
  accountType: string
  institution: string | null
  lastFour: string | null
  statementDueDay: number | null
  memberId: string
  memberName: string
  memberAvatarUrl: string | null
  // signed cents: positive = member owes the card; negative = member overpaid (credit)
  balanceCents: number
}

/**
 * Settlement balance query (D-05).
 *
 * Per-member, per-account balance is computed in a single GROUP BY query:
 *   (sum of expense + refund splits assigned to this member on this account)
 *   minus (sum of settlement transaction.amount on this account where the settlement
 *   has an assignee row pointing at this member).
 *
 * Refunds reduce the balance: a refund's split is subtracted (treated as money returning).
 * Implementation note: we include refund splits with a NEGATIVE sign in the running aggregate.
 *
 * Settlements DO NOT have assignee splits in the v1 model in the same way expenses do —
 * a settlement transaction has exactly ONE assignee row for payerMemberId and the row's
 * amountCents equals the transaction.amount. So we can sum settlement assignee rows directly.
 *
 * Final formula (per (accountId, memberId)):
 *   balanceCents =
 *     SUM(CASE
 *       WHEN tx.type = 'expense' THEN ta.amount_cents
 *       WHEN tx.type = 'refund' THEN -ta.amount_cents
 *       WHEN tx.type = 'settlement' THEN -ta.amount_cents
 *       ELSE 0
 *     END)::bigint
 *
 * income/transfer/contribution types are filtered out by the WHERE clause so no CASE branch is needed.
 *
 * The query joins to orgMembers + users so each row carries displayName + imageUrl
 * for the response (D-04 — avoid a second /members fetch).
 */
export async function fetchSettlementBalances(orgId: string): Promise<SettlementBalanceRow[]> {
  const rows = await db
    .select({
      accountId: accounts.id,
      accountName: accounts.name,
      accountType: accounts.type,
      institution: accounts.institution,
      lastFour: accounts.lastFour,
      statementDueDay: accounts.statementDueDay,
      memberId: orgMembers.id,
      memberName: orgMembers.displayName,
      memberAvatarUrl: users.imageUrl,
      balanceCents: sql<number>`COALESCE(SUM(CASE
          WHEN ${transactions.type} = 'expense' THEN ${transactionAssignees.amountCents}
          WHEN ${transactions.type} = 'refund' THEN -${transactionAssignees.amountCents}
          WHEN ${transactions.type} = 'settlement' THEN -${transactionAssignees.amountCents}
          ELSE 0
        END), 0)::bigint`.as('balance_cents'),
    })
    .from(accounts)
    .innerJoin(transactions, eq(transactions.accountId, accounts.id))
    .innerJoin(transactionAssignees, eq(transactionAssignees.transactionId, transactions.id))
    .innerJoin(orgMembers, eq(orgMembers.id, transactionAssignees.memberId))
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(
      and(
        eq(accounts.orgId, orgId),
        isNull(accounts.archivedAt), // D-09: non-archived only
        isNull(transactions.deletedAt), // soft-delete partial index
        // D-05: only these types create/reduce balance. Cast follows the project pattern at
        // apps/api/src/lib/queries/transactions.ts:113-115 — Drizzle pgEnum requires this cast.
        inArray(transactions.type, ['expense', 'refund', 'settlement'] as typeof transactions.type._.data[])
      )
    )
    .groupBy(
      accounts.id,
      accounts.name,
      accounts.type,
      accounts.institution,
      accounts.lastFour,
      accounts.statementDueDay,
      orgMembers.id,
      orgMembers.displayName,
      users.imageUrl
    )

  // Drizzle returns ::bigint as string in some configs — coerce defensively.
  return rows.map((r) => ({
    ...r,
    balanceCents: typeof r.balanceCents === 'string' ? Number(r.balanceCents) : r.balanceCents,
  }))
}
