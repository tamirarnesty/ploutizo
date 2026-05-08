import { fetchSettlementBalances } from '../lib/queries/settlements'
import { computeNextDueDate } from '../lib/settlement-due-date'
import type { SettlementBalanceRow } from '../lib/queries/settlements'

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
