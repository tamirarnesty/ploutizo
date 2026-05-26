import { db } from '@ploutizo/db';
import {
  accounts,
  orgMembers,
  transactionAssignees,
  transactions,
  users,
} from '@ploutizo/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  accountInOrg,
  assigneeCountsForOrg,
  orgMemberExists,
  settlementQualifying,
} from '@/lib/queries/scope';

const signedAssigneeAmountSql = sql<number>`(CASE
  WHEN ${transactions.type} = 'expense' THEN ${transactionAssignees.amountCents}
  WHEN ${transactions.type} = 'refund' THEN -${transactionAssignees.amountCents}
  WHEN ${transactions.type} = 'settlement' THEN -${transactionAssignees.amountCents}
  ELSE 0
END)::int`;

const signedTransactionAmountSql = sql<number>`(CASE
  WHEN ${transactions.type} = 'expense' THEN ${transactions.amount}
  WHEN ${transactions.type} = 'refund' THEN -${transactions.amount}
  WHEN ${transactions.type} = 'settlement' THEN -${transactions.amount}
  ELSE 0
END)::int`;

const fetchSettlementScanRows = async (orgId: string) => {
  const assigneeCounts = assigneeCountsForOrg(orgId);

  return db
    .select({
      accountId: accounts.id,
      transactionId: transactions.id,
      memberId: orgMembers.id,
      assigneeCount: assigneeCounts.assigneeCount,
      signedAssigneeCents: signedAssigneeAmountSql,
      signedTransactionCents: signedTransactionAmountSql,
    })
    .from(accounts)
    .innerJoin(transactions, eq(transactions.accountId, accounts.id))
    .innerJoin(
      assigneeCounts,
      eq(assigneeCounts.transactionId, transactions.id)
    )
    .innerJoin(
      transactionAssignees,
      eq(transactionAssignees.transactionId, transactions.id)
    )
    .innerJoin(orgMembers, eq(orgMembers.id, transactionAssignees.memberId))
    .where(and(settlementQualifying(orgId), eq(orgMembers.orgId, orgId)));
};

const settlementCreditCardSelect = {
  accountId: accounts.id,
  accountName: accounts.name,
  accountType: accounts.type,
  institution: accounts.institution,
  lastFour: accounts.lastFour,
  statementDueDay: accounts.statementDueDay,
};

const fetchSettlementCreditCardAccounts = (orgId: string) =>
  db
    .select(settlementCreditCardSelect)
    .from(accounts)
    .where(
      and(
        eq(accounts.orgId, orgId),
        isNull(accounts.archivedAt),
        eq(accounts.type, 'credit_card')
      )
    );

const settlementHouseholdMemberSelect = {
  memberId: orgMembers.id,
  memberName: orgMembers.displayName,
  memberAvatarUrl: users.imageUrl,
};

const fetchSettlementHouseholdMembers = (orgId: string) =>
  db
    .select(settlementHouseholdMemberSelect)
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, orgId));

/**
 * One org-scoped scan over qualifying credit-card transactions × assignees;
 * aggregates personal, shared balance, and shared participants in memory.
 */
const fetchSettlementAggregateParts = async (orgId: string) => {
  const scanRows = await fetchSettlementScanRows(orgId);

  const personalByPair = new Map<string, number>();
  const sharedByAccount = new Map<string, number>();
  const sharedTxSeen = new Set<string>();
  const participantsByAccount = new Map<string, Set<string>>();

  for (const row of scanRows) {
    const count = row.assigneeCount;
    const accountId = row.accountId;
    const txKey = `${accountId}:${row.transactionId}`;

    if (count === 1) {
      const pairKey = `${accountId}:${row.memberId}`;
      personalByPair.set(
        pairKey,
        (personalByPair.get(pairKey) ?? 0) + row.signedAssigneeCents
      );
    } else if (count >= 2) {
      if (!sharedTxSeen.has(txKey)) {
        sharedTxSeen.add(txKey);
        sharedByAccount.set(
          accountId,
          (sharedByAccount.get(accountId) ?? 0) + row.signedTransactionCents
        );
      }
      const set = participantsByAccount.get(accountId) ?? new Set<string>();
      set.add(row.memberId);
      participantsByAccount.set(accountId, set);
    }
  }

  const participantsByAccountSorted = new Map<string, string[]>();
  for (const [accountId, ids] of participantsByAccount) {
    participantsByAccountSorted.set(
      accountId,
      [...ids].sort((a, b) => a.localeCompare(b))
    );
  }

  return { personalByPair, sharedByAccount, participantsByAccount: participantsByAccountSorted };
};

/** Shared participants for one card — used by POST validation. */
export const fetchSharedParticipantIds = async (
  orgId: string,
  accountId: string
): Promise<string[]> => {
  const assigneeCounts = assigneeCountsForOrg(orgId);

  const rows = await db
    .selectDistinct({
      memberId: orgMembers.id,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .innerJoin(
      assigneeCounts,
      sql`${assigneeCounts.transactionId} = ${transactions.id} AND ${assigneeCounts.assigneeCount} >= 2`
    )
    .innerJoin(
      transactionAssignees,
      eq(transactionAssignees.transactionId, transactions.id)
    )
    .innerJoin(orgMembers, eq(orgMembers.id, transactionAssignees.memberId))
    .where(
      and(
        eq(transactions.accountId, accountId),
        settlementQualifying(orgId),
        eq(orgMembers.orgId, orgId)
      )
    );

  return rows.map((r) => r.memberId).sort((a, b) => a.localeCompare(b));
};

/**
 * Settlement balance rows for GET /api/settlements.
 *
 * Credit cards only — settlement is card-centric (see CONTEXT.md). Returns every
 * (account × household member) pair with personal balances from aggregates (0 when no
 * personal activity). Shared bucket and participant ids are duplicated on each member row.
 */
export const fetchSettlementBalances = async (orgId: string) => {
  const [
    { personalByPair, sharedByAccount, participantsByAccount },
    creditCardAccounts,
    householdMembers,
  ] = await Promise.all([
    fetchSettlementAggregateParts(orgId),
    fetchSettlementCreditCardAccounts(orgId),
    fetchSettlementHouseholdMembers(orgId),
  ]);

  const creditCardRows = [];
  for (const cc of creditCardAccounts) {
    const sharedBalanceCents = sharedByAccount.get(cc.accountId) ?? 0;
    const sharedParticipantIds = participantsByAccount.get(cc.accountId) ?? [];
    for (const m of householdMembers) {
      const key = `${cc.accountId}:${m.memberId}`;
      creditCardRows.push({
        ...cc,
        ...m,
        personalBalanceCents: personalByPair.get(key) ?? 0,
        sharedBalanceCents,
        sharedParticipantIds,
      });
    }
  }

  return creditCardRows;
};

export type SettlementBalanceRow = Awaited<
  ReturnType<typeof fetchSettlementBalances>
>[number];

const settlementAccountSelect = {
  id: accounts.id,
  name: accounts.name,
  type: accounts.type,
  archivedAt: accounts.archivedAt,
};

/**
 * Fetch account row for settlement validation (D-18).
 * Returns null if not found or wrong org.
 */
export const fetchAccountForSettlement = async (
  orgId: string,
  accountId: string
) => {
  const rows = await db
    .select(settlementAccountSelect)
    .from(accounts)
    .where(accountInOrg(orgId, accountId, { requireActive: false }))
    .limit(1);
  return rows.at(0) ?? null;
};

/** Verify a member belongs to this org (D-18). */
export const memberBelongsToOrg = async (
  orgId: string,
  memberId: string
): Promise<boolean> => orgMemberExists(orgId, memberId);
