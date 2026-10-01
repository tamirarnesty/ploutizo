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
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Transaction } from '@ploutizo/db';
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

/** Categories for an org (active and archived). */
export const categoriesForOrg = (orgId: string): SQL[] => [
  eq(categories.orgId, orgId),
];

/** Active (non-archived) categories for an org. */
export const activeCategories = (orgId: string): SQL[] => [
  ...categoriesForOrg(orgId),
  isNull(categories.archivedAt),
];

export type CategoryInOrgOptions = {
  /** When true, only non-archived categories match. */
  requireActive?: boolean;
  /** When true, only archived categories match. */
  requireArchived?: boolean;
};

/** Predicate: category id belongs to org (optional active/archived filters). */
export const categoryInOrg = (
  orgId: string,
  categoryId: string,
  options: CategoryInOrgOptions = {}
): SQL => {
  const { requireActive = false, requireArchived = false } = options;
  const parts: SQL[] = [
    eq(categories.id, categoryId),
    eq(categories.orgId, orgId),
  ];
  if (requireActive) parts.push(isNull(categories.archivedAt));
  if (requireArchived) parts.push(isNotNull(categories.archivedAt));
  return and(...parts)!;
};

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

/** Account fields needed for saved-write policy and archive-date validation. */
export type AccountWriteReference = {
  id: string;
  type: AccountType;
  archivedAt: Date | null;
};

export type AccountWriteReferenceOptions = AccountInOrgOptions & {
  /**
   * Take `FOR UPDATE` on the selected snapshot. Independent of `tx` —
   * pass `tx` to read uncommitted writes, and `forUpdate` only when this
   * session must lock the row.
   */
  forUpdate?: boolean;
};

/**
 * Loads an org-scoped account reference for write validation.
 */
export const fetchAccountWriteReference = async (
  orgId: string,
  accountId: string,
  options: AccountWriteReferenceOptions = {},
  tx?: Transaction
): Promise<AccountWriteReference | null> => {
  const { forUpdate = false, ...accountOptions } = options;
  const ex = tx ?? db;
  const query = ex
    .select({
      id: accounts.id,
      type: accounts.type,
      archivedAt: accounts.archivedAt,
    })
    .from(accounts)
    .where(accountInOrg(orgId, accountId, accountOptions))
    .limit(1);
  const rows = await (tx && forUpdate ? query.for('update') : query);
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
  categoryId: string,
  tx?: Transaction
): Promise<boolean> => {
  const ex = tx ?? db;
  const rows = await ex
    .select({ id: categories.id })
    .from(categories)
    .where(categoryInOrg(orgId, categoryId))
    .limit(1);
  return rows.length > 0;
};

const transactionInOrg = (
  orgId: string,
  transactionId: string,
  accountId?: string
): SQL => {
  const parts: SQL[] = [
    eq(transactions.id, transactionId),
    eq(transactions.orgId, orgId),
  ];
  if (accountId) parts.push(eq(transactions.accountId, accountId));
  return and(...parts)!;
};

const findTransactionInScope = async (
  orgId: string,
  transactionId: string,
  accountId: string | undefined,
  tx?: Transaction
): Promise<boolean> => {
  const ex = tx ?? db;
  const rows = await ex
    .select({ id: transactions.id })
    .from(transactions)
    .where(transactionInOrg(orgId, transactionId, accountId))
    .limit(1);
  return rows.length > 0;
};

export const transactionExistsInOrg = async (
  orgId: string,
  transactionId: string,
  tx?: Transaction
): Promise<boolean> =>
  findTransactionInScope(orgId, transactionId, undefined, tx);

/**
 * Org + destination-account ownership for import match writes.
 * Includes soft-deleted rows so a saved decision can still be cleared;
 * review evaluation explains `deleted_target`.
 */
export const transactionExistsOnAccount = async (
  orgId: string,
  transactionId: string,
  accountId: string,
  tx?: Transaction
): Promise<boolean> =>
  findTransactionInScope(orgId, transactionId, accountId, tx);

/**
 * Locks org-scoped account write references (active and archived) in one
 * statement. Rows lock in id order, so concurrent writers touching
 * overlapping accounts acquire locks in the same global order and cannot
 * deadlock.
 */
export const lockAccountWriteReferences = async (
  tx: Transaction,
  orgId: string,
  accountIds: readonly string[]
): Promise<AccountWriteReference[]> => {
  if (accountIds.length === 0) return [];
  return tx
    .select({
      id: accounts.id,
      type: accounts.type,
      archivedAt: accounts.archivedAt,
    })
    .from(accounts)
    .where(
      and(eq(accounts.orgId, orgId), inArray(accounts.id, [...accountIds]))
    )
    .orderBy(accounts.id)
    .for('update');
};

/** Category ids (active and archived) from the list that exist under orgId. */
export const listCategoryIdsInOrg = async (
  orgId: string,
  categoryIds: readonly string[],
  tx?: Transaction
): Promise<Set<string>> => {
  if (categoryIds.length === 0) return new Set();
  const ex = tx ?? db;
  const rows = await ex
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        ...categoriesForOrg(orgId),
        inArray(categories.id, [...new Set(categoryIds)])
      )
    );
  return new Set(rows.map((row) => row.id));
};

/** Transaction ids (including soft-deleted) from the list that exist under orgId. */
export const listTransactionIdsInOrg = async (
  orgId: string,
  transactionIds: readonly string[],
  tx?: Transaction
): Promise<Set<string>> => {
  if (transactionIds.length === 0) return new Set();
  const ex = tx ?? db;
  const rows = await ex
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.orgId, orgId),
        inArray(transactions.id, [...new Set(transactionIds)])
      )
    );
  return new Set(rows.map((row) => row.id));
};

/** Tag ids from the list that exist under orgId. */
export const listTagIdsInOrg = async (
  orgId: string,
  tagIds: readonly string[],
  tx?: Transaction
): Promise<Set<string>> => {
  if (tagIds.length === 0) return new Set();
  const ex = tx ?? db;
  const rows = await ex
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.orgId, orgId), inArray(tags.id, [...new Set(tagIds)])));
  return new Set(rows.map((row) => row.id));
};

/** Member ids from the list that exist under orgId. */
export const listMemberIdsInOrg = async (
  orgId: string,
  memberIds: readonly string[],
  tx?: Transaction
): Promise<Set<string>> => {
  if (memberIds.length === 0) return new Set();
  const ex = tx ?? db;
  const rows = await ex
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, orgId),
        inArray(orgMembers.id, [...new Set(memberIds)])
      )
    );
  return new Set(rows.map((row) => row.id));
};

/** True when every tag id exists under orgId. Empty list is vacuously true. */
export const allTagsInOrg = async (
  orgId: string,
  tagIds: string[],
  tx?: Transaction
): Promise<boolean> =>
  (await listTagIdsInOrg(orgId, tagIds, tx)).size === new Set(tagIds).size;

/** True when every member id exists under orgId. Empty list is vacuously true. */
export const allMembersInOrg = async (
  orgId: string,
  memberIds: string[],
  tx?: Transaction
): Promise<boolean> =>
  (await listMemberIdsInOrg(orgId, memberIds, tx)).size ===
  new Set(memberIds).size;
