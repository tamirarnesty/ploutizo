import { DomainError, NotFoundError } from '../lib/errors'
import { fetchAccountForSettlement, fetchSettlementBalances, memberBelongsToOrg } from '../lib/queries/settlements'
import { computeNextDueDate } from '../lib/settlement-due-date'
import { createTransaction } from './transactions'
import type { SettlementBalanceRow } from '../lib/queries/settlements'
import type { CreateSettlementInput } from '@ploutizo/validators'

export interface SettlementMemberRow {
  member: { id: string; name: string; avatarUrl: string | null }
  balanceCents: number
}

export interface SettlementAccountRow {
  account: {
    id: string
    name: string
    type: string
    institution: string | null
    lastFour: string | null
    statementDueDay: number | null
  }
  totalBalanceCents: number
  members: SettlementMemberRow[]
  dueDate: string | null
  status: 'due_soon' | 'on_track' | null
}

export interface GetSettlementBalancesResponse {
  accounts: SettlementAccountRow[]
}

/**
 * Service layer: shapes the raw query rows into the GET /api/settlements response (D-02).
 *   - Groups raw rows by accountId (using a Map for O(1) lookup, per js-perf skill)
 *   - Computes totalBalanceCents per account
 *   - Filters out accounts where every member balance is zero (D-08)
 *   - Computes dueDate + status from statementDueDay (D-13, D-14)
 *
 * @param orgId - tenant scope (from tenantGuard via c.get('orgId'))
 * @param now - injectable clock for testability; defaults to new Date()
 */
export async function getSettlementBalances(
  orgId: string,
  now: Date = new Date()
): Promise<GetSettlementBalancesResponse> {
  const rows: SettlementBalanceRow[] = await fetchSettlementBalances(orgId)

  // Group by account (Map for O(1) lookup — vercel js-perf skill).
  const byAccount = new Map<
    string,
    {
      account: SettlementAccountRow['account']
      members: SettlementMemberRow[]
    }
  >()

  for (const row of rows) {
    let bucket = byAccount.get(row.accountId)
    if (!bucket) {
      bucket = {
        account: {
          id: row.accountId,
          name: row.accountName,
          type: row.accountType,
          institution: row.institution,
          lastFour: row.lastFour,
          statementDueDay: row.statementDueDay,
        },
        members: [],
      }
      byAccount.set(row.accountId, bucket)
    }
    bucket.members.push({
      member: {
        id: row.memberId,
        name: row.memberName,
        avatarUrl: row.memberAvatarUrl,
      },
      balanceCents: row.balanceCents,
    })
  }

  // Shape final response.
  const accounts: SettlementAccountRow[] = []
  for (const bucket of byAccount.values()) {
    const totalBalanceCents = bucket.members.reduce((acc, m) => acc + m.balanceCents, 0)

    // D-08: omit accounts where every member balance is 0.
    const allZero = bucket.members.every((m) => m.balanceCents === 0)
    if (allZero) continue

    const { dueDate, status } = computeNextDueDate(bucket.account.statementDueDay, now)

    accounts.push({
      account: bucket.account,
      totalBalanceCents,
      members: bucket.members,
      dueDate,
      status,
    })
  }

  return { accounts }
}

/**
 * POST /api/settlements — createSettlement records a settlement payment (D-03).
 *
 * Validates accountId + payerMemberId belong to this org and account is not archived.
 * Then delegates to the existing createTransaction service so the underlying transaction
 * row, transaction_assignees row, and any tx-level invariants (split sum, FK checks) are
 * exercised through the same code path as direct transaction creation.
 *
 * The auto-filled fields (D-03):
 *   - type: 'settlement'
 *   - description: `Settlement: <account.name>`
 *   - assignees: [{ memberId: payerMemberId, amountCents }]  (single assignee, sum = amount)
 */
export async function createSettlement(
  orgId: string,
  data: CreateSettlementInput
) {
  // D-18: account scope + archive check
  const account = await fetchAccountForSettlement(data.accountId, orgId)
  if (!account) throw new NotFoundError('Account not found')
  if (account.archivedAt !== null) {
    throw new DomainError(400, 'Cannot settle an archived account')
  }

  // D-18: member scope check
  const memberOk = await memberBelongsToOrg(data.payerMemberId, orgId)
  if (!memberOk) throw new NotFoundError('Member not found in this household')

  // Delegate to the existing service so split sum validation, FK checks, and the
  // transactions+assignees write happen via one consistent code path.
  return createTransaction(orgId, {
    type: 'settlement',
    accountId: data.accountId,
    amount: data.amountCents,
    date: data.date,
    description: `Settlement: ${account.name}`,
    assignees: [
      {
        memberId: data.payerMemberId,
        amountCents: data.amountCents,
        // percentage is display cache; for a single-assignee 100% settlement, omit (will be null in DB)
      },
    ],
  })
}
