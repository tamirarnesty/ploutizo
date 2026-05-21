import { db } from '@ploutizo/db';
import {
  accounts,
  orgMembers,
  transactionAssignees,
  transactions,
  users,
} from '@ploutizo/db/schema';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { AccountType } from '@ploutizo/types';

const QUALIFYING_TX_TYPES = [
  'expense',
  'refund',
  'settlement',
] as (typeof transactions.type._.data)[];

const signedAssigneeAmountSql = sql<number>`CASE
  WHEN ${transactions.type} = 'expense' THEN ${transactionAssignees.amountCents}
  WHEN ${transactions.type} = 'refund' THEN -${transactionAssignees.amountCents}
  WHEN ${transactions.type} = 'settlement' THEN -${transactionAssignees.amountCents}
  ELSE 0
END`;

const signedTransactionAmountSql = sql<number>`CASE
  WHEN ${transactions.type} = 'expense' THEN ${transactions.amount}
  WHEN ${transactions.type} = 'refund' THEN -${transactions.amount}
  WHEN ${transactions.type} = 'settlement' THEN -${transactions.amount}
  ELSE 0
END`;

const assigneeCountSubquery = db
  .select({
    transactionId: transactionAssignees.transactionId,
    assigneeCount: sql<number>`COUNT(*)::int`.as('assignee_count'),
  })
  .from(transactionAssignees)
  .groupBy(transactionAssignees.transactionId)
  .as('assignee_counts');

const settlementScopeWhere = (orgId: string) =>
  and(
    eq(accounts.orgId, orgId),
    isNull(accounts.archivedAt),
    isNull(transactions.deletedAt),
    inArray(transactions.type, QUALIFYING_TX_TYPES)
  );

const coerceBigInt = (value: number | string): number =>
  typeof value === 'string' ? Number(value) : value;

export interface SettlementBalanceRow {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  institution: string | null;
  lastFour: string | null;
  statementDueDay: number | null;
  memberId: string;
  memberName: string;
  memberAvatarUrl: string | null;
  personalBalanceCents: number;
  sharedBalanceCents: number;
  sharedParticipantIds: string[];
}

/** Personal bucket: qualifying txs with exactly one assignee. */
const fetchPersonalAggregateRows = async (orgId: string) => {
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
      personalBalanceCents: sql<number>`COALESCE(SUM(${signedAssigneeAmountSql}), 0)::bigint`.as(
        'personal_balance_cents'
      ),
    })
    .from(accounts)
    .innerJoin(transactions, eq(transactions.accountId, accounts.id))
    .innerJoin(
      transactionAssignees,
      eq(transactionAssignees.transactionId, transactions.id)
    )
    .innerJoin(
      assigneeCountSubquery,
      sql`${assigneeCountSubquery.transactionId} = ${transactions.id} AND ${assigneeCountSubquery.assigneeCount} = 1`
    )
    .innerJoin(orgMembers, eq(orgMembers.id, transactionAssignees.memberId))
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(settlementScopeWhere(orgId))
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

  return rows.map((r) => ({
    ...r,
    personalBalanceCents: coerceBigInt(r.personalBalanceCents),
  }));
};

/** Shared bucket: qualifying txs with two or more assignees (once per tx). */
const fetchSharedBalanceByAccount = async (
  orgId: string
): Promise<Map<string, number>> => {
  const rows = await db
    .select({
      accountId: accounts.id,
      sharedBalanceCents: sql<number>`COALESCE(SUM(${signedTransactionAmountSql}), 0)::bigint`.as(
        'shared_balance_cents'
      ),
    })
    .from(accounts)
    .innerJoin(transactions, eq(transactions.accountId, accounts.id))
    .innerJoin(
      assigneeCountSubquery,
      sql`${assigneeCountSubquery.transactionId} = ${transactions.id} AND ${assigneeCountSubquery.assigneeCount} >= 2`
    )
    .where(settlementScopeWhere(orgId))
    .groupBy(accounts.id);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.accountId, coerceBigInt(row.sharedBalanceCents));
  }
  return map;
};

/** Union of assignee ids on shared qualifying txs per card (current org members only). */
export const fetchSharedParticipantIdsByOrg = async (
  orgId: string
): Promise<Map<string, string[]>> => {
  const rows = await db
    .selectDistinct({
      accountId: accounts.id,
      memberId: orgMembers.id,
    })
    .from(accounts)
    .innerJoin(transactions, eq(transactions.accountId, accounts.id))
    .innerJoin(
      assigneeCountSubquery,
      sql`${assigneeCountSubquery.transactionId} = ${transactions.id} AND ${assigneeCountSubquery.assigneeCount} >= 2`
    )
    .innerJoin(
      transactionAssignees,
      eq(transactionAssignees.transactionId, transactions.id)
    )
    .innerJoin(orgMembers, eq(orgMembers.id, transactionAssignees.memberId))
    .where(and(settlementScopeWhere(orgId), eq(orgMembers.orgId, orgId)));

  const byAccount = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = byAccount.get(row.accountId) ?? new Set<string>();
    set.add(row.memberId);
    byAccount.set(row.accountId, set);
  }

  const result = new Map<string, string[]>();
  for (const [accountId, ids] of byAccount) {
    result.set(accountId, [...ids].sort((a, b) => a.localeCompare(b)));
  }
  return result;
};

/** Shared participants for one card — used by POST validation. */
export const fetchSharedParticipantIds = async (
  accountId: string,
  orgId: string
): Promise<string[]> => {
  const rows = await db
    .selectDistinct({
      memberId: orgMembers.id,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .innerJoin(
      assigneeCountSubquery,
      sql`${assigneeCountSubquery.transactionId} = ${transactions.id} AND ${assigneeCountSubquery.assigneeCount} >= 2`
    )
    .innerJoin(
      transactionAssignees,
      eq(transactionAssignees.transactionId, transactions.id)
    )
    .innerJoin(orgMembers, eq(orgMembers.id, transactionAssignees.memberId))
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(accounts.orgId, orgId),
        isNull(accounts.archivedAt),
        isNull(transactions.deletedAt),
        inArray(transactions.type, QUALIFYING_TX_TYPES),
        eq(orgMembers.orgId, orgId)
      )
    );

  return rows.map((r) => r.memberId).sort((a, b) => a.localeCompare(b));
};

/**
 * Settlement balance rows for GET /api/settlements.
 *
 * For **credit_card** accounts: returns every (account × household member) pair with
 * personal balances from aggregates (0 when no personal activity). Shared bucket and
 * participant ids are duplicated on each member row for the same account.
 *
 * Non-credit accounts keep the previous behavior: only (account, member) pairs that
 * appear on qualifying personal transactions.
 */
export const fetchSettlementBalances = async (
  orgId: string
): Promise<SettlementBalanceRow[]> => {
  const [personalRows, sharedByAccount, participantsByAccount] =
    await Promise.all([
      fetchPersonalAggregateRows(orgId),
      fetchSharedBalanceByAccount(orgId),
      fetchSharedParticipantIdsByOrg(orgId),
    ]);

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

  const personalByPair = new Map<string, (typeof personalRows)[number]>();
  for (const r of personalRows) {
    if (r.accountType === 'credit_card') {
      personalByPair.set(`${r.accountId}:${r.memberId}`, r);
    }
  }

  const creditCardRows: SettlementBalanceRow[] = [];
  for (const cc of creditCardAccounts) {
    const sharedBalanceCents = sharedByAccount.get(cc.id) ?? 0;
    const sharedParticipantIds = participantsByAccount.get(cc.id) ?? [];
    for (const m of householdMembers) {
      const key = `${cc.id}:${m.memberId}`;
      const agg = personalByPair.get(key);
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
        personalBalanceCents: agg?.personalBalanceCents ?? 0,
        sharedBalanceCents,
        sharedParticipantIds,
      });
    }
  }

  const nonCreditRows: SettlementBalanceRow[] = personalRows
    .filter((r) => r.accountType !== 'credit_card')
    .map((r) => ({
      accountId: r.accountId,
      accountName: r.accountName,
      accountType: r.accountType,
      institution: r.institution,
      lastFour: r.lastFour,
      statementDueDay: r.statementDueDay,
      memberId: r.memberId,
      memberName: r.memberName,
      memberAvatarUrl: r.memberAvatarUrl,
      personalBalanceCents: r.personalBalanceCents,
      sharedBalanceCents: sharedByAccount.get(r.accountId) ?? 0,
      sharedParticipantIds: participantsByAccount.get(r.accountId) ?? [],
    }));

  return [...creditCardRows, ...nonCreditRows];
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
