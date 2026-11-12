import { db } from '@ploutizo/db';
import {
  accounts,
  categories,
  importTransactionLinks,
  orgMembers,
  tags,
  transactionAssignees,
  transactionTags,
  transactions,
  users,
} from '@ploutizo/db/schema';
import { alias } from 'drizzle-orm/pg-core';
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  not,
  or,
  sql,
} from 'drizzle-orm';
import { TRANSACTION_FILTER_SENTINELS } from '@ploutizo/types';
import type { Transaction } from '@ploutizo/db';
import type {
  SortOrder,
  TransactionSortField,
  TransactionType,
} from '@ploutizo/types';
import type { SQL } from 'drizzle-orm';
import {
  activeTransactions,
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
import { searchMatchesCondition } from '@/lib/queries/transactionListSearch';

// Alias for counterpart account join (D-23) — left join to accounts using counterpartAccountId FK
const counterpartAccounts = alias(accounts, 'counterpart_accounts');
// Alias for refund self-join (D-24) — flat fields, no nested object
const refundSource = alias(transactions, 'refund_source');

// D-04: full column projection for joined transaction rows
const TX_COLUMNS = {
  id: transactions.id,
  orgId: transactions.orgId,
  type: transactions.type,
  amount: transactions.amount,
  date: transactions.date,
  description: transactions.description,
  categoryId: transactions.categoryId,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  categoryColour: categories.colour,
  accountId: transactions.accountId,
  accountName: accounts.name,
  accountType: accounts.type,
  refundOf: transactions.refundOf,
  incomeType: transactions.incomeType,
  counterpartAccountId: transactions.counterpartAccountId,
  counterpartAccountName: counterpartAccounts.name,
  rawDescription: transactions.rawDescription,
  notes: transactions.notes,
  refundOfId: refundSource.id,
  refundOfDate: refundSource.date,
  refundOfAmountCents: refundSource.amount,
  importBatchId: transactions.importBatchId,
  externalId: transactions.externalId,
  recurringTemplateId: transactions.recurringTemplateId,
  deletedAt: transactions.deletedAt,
  createdAt: transactions.createdAt,
  updatedAt: transactions.updatedAt,
} as const;

export type ListQueryParams = {
  orgId: string;
  page: number;
  limit: number;
  sort: TransactionSortField;
  order: SortOrder;
  /** Inclusive any-of; omit for no filter. */
  types?: TransactionType[];
  /** Inclusive any-of. */
  accountIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  /** Inclusive any-of; `none` also matches uncategorized. */
  categoryIds?: string[];
  /** Member ids ANDed together; `personal` / `shared` constrain the assignee count. */
  assigneeIds?: string[];
  /** Inclusive any-of; `none` also matches untagged. */
  tagIds?: string[];
  /** Case-insensitive substring match on description, rawDescription, category, account, and tag names (T-03.4-01). Not assignee, amount, or date. */
  search?: string;
  // Operator params — simple filters are positive multi-select only; only
  // the date range carries an operator.
  dateRange_op?: string; // 'between' | 'after' | 'before' | 'is' | 'is_not' | 'not_between'
  importLink?: { batchId: string; outcome: 'created' | 'matched' };
};

const importTransactionLinkExists = (
  orgId: string,
  link: { batchId: string; outcome: 'created' | 'matched' }
) =>
  exists(
    db
      .select({ one: sql`1` })
      .from(importTransactionLinks)
      .where(
        and(
          eq(importTransactionLinks.transactionId, transactions.id),
          eq(importTransactionLinks.orgId, orgId),
          eq(importTransactionLinks.batchId, link.batchId),
          eq(importTransactionLinks.outcome, link.outcome)
        )
      )
  );

/** Splits a filter's values into real ids and whether the `none` sentinel is present. */
const partitionNone = (values: string[]) => ({
  ids: values.filter((value) => value !== TRANSACTION_FILTER_SENTINELS.none),
  none: values.includes(TRANSACTION_FILTER_SENTINELS.none),
});

/** Adds one condition matching any of the defined clauses; no-op when none are defined. */
const pushAnyOf = (conditions: SQL[], clauses: (SQL | undefined)[]) => {
  const defined = clauses.filter((clause) => clause !== undefined);
  if (defined.length > 0) conditions.push(or(...defined)!);
};

// Build the WHERE conditions array for list + count queries
export const buildConditions = (params: ListQueryParams): SQL[] => {
  const conditions: SQL[] = [...activeTransactions(params.orgId)];

  if (params.types?.length) {
    conditions.push(inArray(transactions.type, params.types));
  }

  if (params.accountIds?.length) {
    conditions.push(inArray(transactions.accountId, params.accountIds));
  }

  // dateRange — operator determines which Drizzle condition is applied
  const dateOp = params.dateRange_op ?? 'between';
  if (dateOp === 'after' && params.dateFrom) {
    conditions.push(gt(transactions.date, params.dateFrom));
  } else if (dateOp === 'before' && params.dateTo) {
    conditions.push(lt(transactions.date, params.dateTo));
  } else if (dateOp === 'is' && params.dateFrom) {
    // 'is X' = exact date match: dateFrom === dateTo === X sent by client
    conditions.push(eq(transactions.date, params.dateFrom));
  } else if (dateOp === 'is_not' && params.dateFrom) {
    // 'is not X' = exclude that exact date
    conditions.push(ne(transactions.date, params.dateFrom));
  } else if (dateOp === 'not_between' && (params.dateFrom || params.dateTo)) {
    // 'not between A and B' = exclude the range [A, B]
    // not(A <= date <= B)  ≡  date < A OR date > B
    const clauses: SQL[] = [];
    if (params.dateFrom) clauses.push(gte(transactions.date, params.dateFrom));
    if (params.dateTo) clauses.push(lte(transactions.date, params.dateTo));
    if (clauses.length > 0) conditions.push(not(and(...clauses)!));
  } else {
    // 'between' (default) — existing behaviour
    if (params.dateFrom)
      conditions.push(gte(transactions.date, params.dateFrom));
    if (params.dateTo) conditions.push(lte(transactions.date, params.dateTo));
  }

  if (params.categoryIds?.length) {
    const { ids, none } = partitionNone(params.categoryIds);
    pushAnyOf(conditions, [
      ids.length > 0 ? inArray(transactions.categoryId, ids) : undefined,
      none ? isNull(transactions.categoryId) : undefined,
    ]);
  }

  // assigneeIds — every selected member must be an assignee (AND), plus
  // 'personal'/'shared' shape sentinels constraining the assignee count. Both
  // shapes selected means no shape constraint.
  if (params.assigneeIds?.length) {
    const { personal, shared } = TRANSACTION_FILTER_SENTINELS;
    const memberIds = params.assigneeIds.filter(
      (value) => value !== personal && value !== shared
    );
    const wantsPersonal = params.assigneeIds.includes(personal);
    const wantsShared = params.assigneeIds.includes(shared);
    for (const memberId of memberIds) {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(transactionAssignees)
            .where(
              and(
                eq(transactionAssignees.transactionId, transactions.id),
                eq(transactionAssignees.memberId, memberId)
              )
            )
        )
      );
    }
    if (wantsPersonal !== wantsShared) {
      const assigneeCount = sql<number>`(select count(*)::int from ${transactionAssignees} where ${transactionAssignees.transactionId} = ${transactions.id})`;
      conditions.push(
        wantsPersonal ? eq(assigneeCount, 1) : gte(assigneeCount, 2)
      );
    }
  }

  if (params.tagIds?.length) {
    const { ids, none } = partitionNone(params.tagIds);
    const taggedWith = (tagIds?: string[]) =>
      db
        .select({ one: sql`1` })
        .from(transactionTags)
        .where(
          and(
            eq(transactionTags.transactionId, transactions.id),
            tagIds ? inArray(transactionTags.tagId, tagIds) : undefined
          )
        );
    pushAnyOf(conditions, [
      ids.length > 0 ? exists(taggedWith(ids)) : undefined,
      none ? not(exists(taggedWith())) : undefined,
    ]);
  }

  if (params.search) {
    conditions.push(searchMatchesCondition(params.orgId, params.search));
  }

  if (params.importLink) {
    conditions.push(
      importTransactionLinkExists(params.orgId, params.importLink)
    );
  }

  return conditions;
};

// Paginated base rows query with joins to categories + accounts
export const buildListQuery = async (params: ListQueryParams) => {
  const conditions = buildConditions(params);
  const orderCol =
    params.sort === 'amount'
      ? transactions.amount
      : params.sort === 'type'
        ? transactions.type
        : params.sort === 'category'
          ? categories.name
          : params.sort === 'account'
            ? accounts.name
            : transactions.date;
  const orderFn = params.order === 'asc' ? asc : desc;
  const offset = (params.page - 1) * params.limit;

  return db
    .select(TX_COLUMNS)
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(
      counterpartAccounts,
      eq(transactions.counterpartAccountId, counterpartAccounts.id)
    )
    .leftJoin(refundSource, eq(transactions.refundOf, refundSource.id))
    .where(and(...conditions))
    .orderBy(orderFn(orderCol))
    .limit(params.limit)
    .offset(offset);
};

// Count query — returns total matching rows for pagination envelope (D-07)
export const countQuery = async (params: ListQueryParams): Promise<number> => {
  const conditions = buildConditions(params);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(...conditions));
  return total;
};

// Single transaction by id — same column projection as list (D-05)
// Optional `tx`: when provided, read participates in the caller's transaction (e.g. PATCH split validation + write).
export const fetchTransactionById = async (
  orgId: string,
  id: string,
  tx?: Transaction
) => {
  const ex = tx ?? db;
  const rows = await ex
    .select(TX_COLUMNS)
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(
      counterpartAccounts,
      eq(transactions.counterpartAccountId, counterpartAccounts.id)
    )
    .leftJoin(refundSource, eq(transactions.refundOf, refundSource.id))
    .where(and(eq(transactions.id, id), ...activeTransactions(orgId)))
    .limit(1);
  return rows.at(0) ?? null;
};

// Enrich a page of base rows with assignees and tags via parallel sub-queries.
// Avoids cartesian product from multi-level left joins (RESEARCH.md Pitfall 1).
// Optional `tx`: when provided, reads use the caller's transaction executor.
export const enrichTransactions = async (
  orgId: string,
  baseRows: { id: string }[],
  tx?: Transaction
) => {
  const ex = tx ?? db;
  const txIds = baseRows.map((r) => r.id);
  if (txIds.length === 0) {
    return {
      assigneeMap: {} as Record<string, unknown[]>,
      tagMap: {} as Record<string, unknown[]>,
    };
  }

  // Pitfall 6: guard against inArray([]) which generates invalid SQL
  const [assigneeRows, tagRows] = await Promise.all([
    ex
      .select({
        transactionId: transactionAssignees.transactionId,
        memberId: transactionAssignees.memberId,
        amountCents: transactionAssignees.amountCents,
        percentage: sql<
          number | null
        >`${transactionAssignees.percentage}`.mapWith(Number), // numeric column → number; display only
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        imageUrl: users.imageUrl,
      })
      .from(transactionAssignees)
      .innerJoin(
        transactions,
        eq(transactions.id, transactionAssignees.transactionId)
      )
      .innerJoin(orgMembers, eq(transactionAssignees.memberId, orgMembers.id))
      .innerJoin(users, eq(users.id, orgMembers.userId))
      .where(
        and(
          eq(transactions.orgId, orgId),
          eq(orgMembers.orgId, orgId),
          inArray(transactionAssignees.transactionId, txIds)
        )
      ),

    ex
      .select({
        transactionId: transactionTags.transactionId,
        id: tags.id,
        name: tags.name,
        colour: tags.colour,
      })
      .from(transactionTags)
      .innerJoin(
        transactions,
        eq(transactions.id, transactionTags.transactionId)
      )
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .where(
        and(
          eq(transactions.orgId, orgId),
          eq(tags.orgId, orgId),
          inArray(transactionTags.transactionId, txIds)
        )
      ),
  ]);

  const assigneeMap: Record<string, typeof assigneeRows> = {};
  for (const a of assigneeRows) {
    (assigneeMap[a.transactionId] ??= []).push(a);
  }
  const tagMap: Record<string, typeof tagRows> = {};
  for (const t of tagRows) {
    (tagMap[t.transactionId] ??= []).push(t);
  }
  return { assigneeMap, tagMap };
};

// Validate counterpartAccountId belongs to the same org — T1 security mitigation (T-03.4.1-T1)
export const counterpartAccountBelongsToOrg = async (
  orgId: string,
  accountId: string,
  tx?: Transaction
): Promise<boolean> =>
  Boolean(
    await fetchAccountWriteReference(
      orgId,
      accountId,
      { requireActive: false },
      tx
    )
  );

// Validate that a refundOf transaction ID exists in the same org (D-13)
export const refundOfExists = async (
  orgId: string,
  refundOfId: string,
  tx?: Transaction
): Promise<boolean> => transactionExistsInOrg(orgId, refundOfId, tx);

// Soft-delete a transaction by setting deletedAt = now() (D-15).
// WHERE: eq(id) + eq(orgId) + isNull(deletedAt) — prevents cross-org and double-delete.
// Returns {id} on success or null if not found / wrong org / already deleted.
export const softDeleteTransactionQuery = async (
  orgId: string,
  id: string
): Promise<{ id: string } | null> => {
  const rows = await db
    .update(transactions)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(transactions.id, id), ...activeTransactions(orgId)))
    .returning({ id: transactions.id });
  return rows.at(0) ?? null;
};

// Restore a soft-deleted transaction by setting deletedAt = null (D-15).
// WHERE: eq(id) + eq(orgId) + isNotNull(deletedAt) — only restores actually-deleted rows (T-03.3-05).
// Returns {id} on success or null if not found / wrong org / already active.
export const restoreTransactionQuery = async (
  orgId: string,
  id: string
): Promise<{ id: string } | null> => {
  const rows = await db
    .update(transactions)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.orgId, orgId),
        isNotNull(transactions.deletedAt) // only restore actually-deleted rows
      )
    )
    .returning({ id: transactions.id });
  return rows.at(0) ?? null;
};

// Update scalar columns for a transaction inside an outer db.transaction() (tx is passed in).
// WHERE: eq(id) + eq(orgId) + isNull(deletedAt) — Pitfall 7: 0 rows → returns null → caller sends 404.
// Returns the updated row or null if not found / wrong org / already deleted.
export const updateTransactionScalarsQuery = async (
  tx: Transaction,
  orgId: string,
  id: string,
  data: Record<string, unknown>
) => {
  const rows = await tx
    .update(transactions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), ...activeTransactions(orgId)))
    .returning();
  return rows.at(0) ?? null;
};

// Replace-all assignees for a transaction inside an outer db.transaction().
// D-03: always deletes existing rows first; inserts new ones if assignees is non-empty.
// percentage column is numeric — Drizzle expects string.
export const replaceAssignees = async (
  tx: Transaction,
  transactionId: string,
  assignees: {
    memberId: string;
    amountCents: number;
    percentage: number;
  }[]
): Promise<void> => {
  await tx
    .delete(transactionAssignees)
    .where(eq(transactionAssignees.transactionId, transactionId));
  if (assignees.length > 0) {
    await tx.insert(transactionAssignees).values(
      assignees.map((a) => ({
        transactionId,
        memberId: a.memberId,
        amountCents: a.amountCents,
        percentage: a.percentage.toString(),
      }))
    );
  }
};

// Replace-all tags for a transaction inside an outer db.transaction().
// D-03: always deletes existing rows first; inserts new ones if tagIds is non-empty.
export const replaceTags = async (
  tx: Transaction,
  transactionId: string,
  tagIds: string[]
): Promise<void> => {
  await tx
    .delete(transactionTags)
    .where(eq(transactionTags.transactionId, transactionId));
  if (tagIds.length > 0) {
    await tx
      .insert(transactionTags)
      .values(tagIds.map((tagId) => ({ transactionId, tagId })));
  }
};
