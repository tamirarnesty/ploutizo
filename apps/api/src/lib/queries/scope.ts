/**
 * Org-scoped query predicates and ownership checks (ADR 0003).
 * Compose these in domain query modules instead of restating eq(table.orgId, orgId).
 */
import { db } from '@ploutizo/db';
import {
  accounts,
  categories,
  orgMembers,
  tags,
  transactionAssignees,
  transactions,
} from '@ploutizo/db/schema';
import { SETTLEMENT_QUALIFYING_TRANSACTION_TYPE_VALUES } from '@ploutizo/types';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { AccountType } from '@ploutizo/types';
import type { SQL } from 'drizzle-orm';

const SETTLEMENT_QUALIFYING_TX_TYPES =
  SETTLEMENT_QUALIFYING_TRANSACTION_TYPE_VALUES;

/** Active transactions for an org: org_id + not soft-deleted. */
export const activeTransactions = (orgId: string): SQL[] => [
  eq(transactions.orgId, orgId),
  isNull(transactions.deletedAt),
];

/** Active (non-archived) accounts for an org. */
export const activeAccounts = (orgId: string): SQL[] => [
  eq(accounts.orgId, orgId),
  isNull(accounts.archivedAt),
];

/** Settlement balance aggregates: active tx + active credit_card account + qualifying types. */
export const settlementQualifying = (orgId: string): SQL =>
  and(
    eq(transactions.orgId, orgId),
    eq(accounts.orgId, orgId),
    isNull(transactions.deletedAt),
    isNull(accounts.archivedAt),
    inArray(transactions.type, SETTLEMENT_QUALIFYING_TX_TYPES),
    eq(accounts.type, 'credit_card')
  )!;

export type AccountInOrgOptions = {
  /** When true, only non-archived accounts match (default). */
  requireActive?: boolean;
  /** Restrict to a specific account type (e.g. credit_card for settlement target). */
  type?: AccountType;
};

/** Predicate: account id belongs to org (optional active/type filters). */
export const accountInOrg = (
  orgId: string,
  accountId: string,
  options: AccountInOrgOptions = {}
): SQL => {
  const { requireActive = true, type } = options;
  const parts: SQL[] = [eq(accounts.id, accountId), eq(accounts.orgId, orgId)];
  if (requireActive) parts.push(isNull(accounts.archivedAt));
  if (type) parts.push(eq(accounts.type, type));
  return and(...parts)!;
};

/** Per-org assignee counts for settlement classification (no global scan). */
export const assigneeCountsForOrg = (orgId: string) =>
  db
    .select({
      transactionId: transactionAssignees.transactionId,
      assigneeCount: sql<number>`COUNT(*)::int`.as('assignee_count'),
    })
    .from(transactionAssignees)
    .innerJoin(
      transactions,
      eq(transactions.id, transactionAssignees.transactionId)
    )
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(settlementQualifying(orgId))
    .groupBy(transactionAssignees.transactionId)
    .as('assignee_counts');

export const orgMemberExists = async (
  orgId: string,
  memberId: string
): Promise<boolean> => {
  const rows = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId)))
    .limit(1);
  return rows.length > 0;
};

export type AccountWriteReference = {
  id: string;
  type: AccountType;
  archivedAt: Date | null;
};

export const fetchAccountWriteReference = async (
  orgId: string,
  accountId: string,
  options?: AccountInOrgOptions
): Promise<AccountWriteReference | null> => {
  const rows = await db
    .select({
      id: accounts.id,
      type: accounts.type,
      archivedAt: accounts.archivedAt,
    })
    .from(accounts)
    .where(accountInOrg(orgId, accountId, options))
    .limit(1);
  return rows.at(0) ?? null;
};

export const accountExistsInOrg = async (
  orgId: string,
  accountId: string,
  options?: AccountInOrgOptions
): Promise<boolean> => {
  const account = await fetchAccountWriteReference(orgId, accountId, options);
  return account !== null;
};

export const categoryExistsInOrg = async (
  orgId: string,
  categoryId: string
): Promise<boolean> => {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.orgId, orgId)))
    .limit(1);
  return rows.length > 0;
};

export const transactionExistsInOrg = async (
  orgId: string,
  transactionId: string
): Promise<boolean> => {
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.orgId, orgId))
    )
    .limit(1);
  return rows.length > 0;
};

/** True when every tag id exists under orgId. Empty list is vacuously true. */
export const allTagsInOrg = async (
  orgId: string,
  tagIds: string[]
): Promise<boolean> => {
  if (tagIds.length === 0) return true;
  const unique = [...new Set(tagIds)];
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.orgId, orgId), inArray(tags.id, unique)));
  return rows.length === unique.length;
};

/** True when every member id exists under orgId. Empty list is vacuously true. */
export const allMembersInOrg = async (
  orgId: string,
  memberIds: string[]
): Promise<boolean> => {
  if (memberIds.length === 0) return true;
  const unique = [...new Set(memberIds)];
  const rows = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), inArray(orgMembers.id, unique)));
  return rows.length === unique.length;
};
