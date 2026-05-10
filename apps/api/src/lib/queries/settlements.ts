import { db } from '@ploutizo/db';
import {
  accounts,
  orgMembers,
  transactionAssignees,
  transactions,
  users,
} from '@ploutizo/db/schema';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

export interface SettlementBalanceRow {
  accountId: string;
  accountName: string;
  accountType: string;
  institution: string | null;
  lastFour: string | null;
  statementDueDay: number | null;
  memberId: string;
  memberName: string;
  memberAvatarUrl: string | null;
  // signed cents: positive = member owes the card; negative = member overpaid (credit).
  // Negative balances are intentional — settlements are not capped by the current balance,
  // so overpayments roll into a credit that offsets future expenses.
  balanceCents: number;
}

/**
 * Per-(account, member) settlement balances from **transactions only** (D-05).
 * Credit-card accounts with no qualifying activity produce no rows here; the exported
 * `fetchSettlementBalances` merges those accounts with every household member at 0 cents.
 *
 * Formula per (accountId, memberId):
 *   SUM(CASE … expense / refund / settlement … END) — see CASE in select below.
 */
const fetchSettlementAggregateRows = async (
  orgId: string
): Promise<SettlementBalanceRow[]> => {
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
    .innerJoin(
      transactionAssignees,
      eq(transactionAssignees.transactionId, transactions.id)
    )
    .innerJoin(orgMembers, eq(orgMembers.id, transactionAssignees.memberId))
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(
      and(
        eq(accounts.orgId, orgId),
        isNull(accounts.archivedAt), // D-09: non-archived only
        isNull(transactions.deletedAt), // soft-delete partial index
        // D-05: only these types create/reduce balance. Cast follows the project pattern at
        // apps/api/src/lib/queries/transactions.ts:113-115 — Drizzle pgEnum requires this cast.
        inArray(transactions.type, [
          'expense',
          'refund',
          'settlement',
        ] as (typeof transactions.type._.data)[])
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
    );

  // Drizzle returns ::bigint as string in some configs — coerce defensively.
  return rows.map((r) => ({
    ...r,
    balanceCents:
      typeof r.balanceCents === 'string'
        ? Number(r.balanceCents)
        : r.balanceCents,
  }));
};

/**
 * Settlement balance rows for GET /api/settlements.
 *
 * For **credit_card** accounts: returns every (account × household member) pair with
 * balances from aggregates (0 when there are no expense/refund/settlement splits yet).
 * Without this, cards that exist in `accounts` but have no qualifying transactions
 * were invisible to the dashboard (inner join to `transactions` produced no rows).
 *
 * Non-credit accounts keep the previous behavior: only (account, member) pairs that
 * appear on qualifying transactions.
 */
export const fetchSettlementBalances = async (
  orgId: string
): Promise<SettlementBalanceRow[]> => {
  const aggregateRows = await fetchSettlementAggregateRows(orgId);

  const creditCardAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      institution: accounts.institution,
      lastFour: accounts.lastFour,
      statementDueDay: accounts.statementDueDay,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.orgId, orgId),
        isNull(accounts.archivedAt),
        eq(accounts.type, 'credit_card' as typeof accounts.type._.data)
      )
    );

  const householdMembers = await db
    .select({
      memberId: orgMembers.id,
      memberName: orgMembers.displayName,
      memberAvatarUrl: users.imageUrl,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, orgId));

  const ccBalanceByPair = new Map<string, number>();
  for (const r of aggregateRows) {
    if (r.accountType === 'credit_card') {
      ccBalanceByPair.set(`${r.accountId}:${r.memberId}`, r.balanceCents);
    }
  }

  const creditCardRows: SettlementBalanceRow[] = [];
  for (const cc of creditCardAccounts) {
    for (const m of householdMembers) {
      const key = `${cc.id}:${m.memberId}`;
      creditCardRows.push({
        accountId: cc.id,
        accountName: cc.name,
        accountType: 'credit_card',
        institution: cc.institution,
        lastFour: cc.lastFour,
        statementDueDay: cc.statementDueDay,
        memberId: m.memberId,
        memberName: m.memberName,
        memberAvatarUrl: m.memberAvatarUrl,
        balanceCents: ccBalanceByPair.get(key) ?? 0,
      });
    }
  }

  const nonCreditAggregateRows = aggregateRows.filter(
    (r) => r.accountType !== 'credit_card'
  );

  return [...creditCardRows, ...nonCreditAggregateRows];
};

/**
 * Fetch account row for settlement validation (D-18).
 * Returns null if not found or wrong org.
 * Caller checks archivedAt to enforce "Cannot settle an archived account".
 */
export const fetchAccountForSettlement = async (
  accountId: string,
  orgId: string
): Promise<{ id: string; name: string; archivedAt: Date | null } | null> => {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      archivedAt: accounts.archivedAt,
    })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.orgId, orgId)))
    .limit(1);
  return rows.at(0) ?? null;
};

/**
 * Verify a member belongs to this org (D-18).
 * Returns true if (memberId, orgId) is a valid orgMembers row.
 */
export const memberBelongsToOrg = async (
  memberId: string,
  orgId: string
): Promise<boolean> => {
  const rows = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId)))
    .limit(1);
  return rows.length > 0;
};
