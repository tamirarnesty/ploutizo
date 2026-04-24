import { db } from '@ploutizo/db';
import {
  accounts,
  categories,
  orgMembers,
  tags,
  transactionAssignees,
  transactionTags,
  transactions,
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
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
// Drizzle transaction type for functions that participate in an outer db.transaction().
// Derived from db's own inference so it stays correct across schema changes.
export type DrizzleTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

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
  recurringTemplateId: transactions.recurringTemplateId,
  deletedAt: transactions.deletedAt,
  createdAt: transactions.createdAt,
  updatedAt: transactions.updatedAt,
} as const;

export type ListQueryParams = {
  orgId: string;
  page: number;
  limit: number;
  sort: 'date' | 'amount' | 'type' | 'category' | 'account';
  order: 'asc' | 'desc';
  type?: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  assigneeId?: string;
  tagIds?: string[];
  /** D-18: case-insensitive substring match on description OR rawDescription — T-03.4-01 */
  description?: string;
  // Operator params — T-03.4.1-OP1: unrecognised values fall through to default (eq/is) behaviour
  type_op?: string;       // 'is' | 'is_not'
  accountId_op?: string;  // 'is' | 'is_not'
  categoryId_op?: string; // 'is' | 'is_not' | 'empty' | 'not_empty'
  assigneeId_op?: string; // 'is' | 'is_not' | 'empty' | 'not_empty'
  tagIds_op?: string;     // 'is_any_of' | 'is_not_any_of' | 'includes_all' | 'excludes_all' | 'empty' | 'not_empty'
  dateRange_op?: string;  // 'between' | 'after' | 'before' | 'is' | 'is_not' | 'not_between'
};

// Build the WHERE conditions array for list + count queries
export function buildConditions(params: ListQueryParams): SQL[] {
  const conditions: SQL[] = [
    eq(transactions.orgId, params.orgId),
    isNull(transactions.deletedAt), // D-15
  ];

  // type — D-25: supports comma-separated values for "Internal" shortcut
  // T-03.4.1-OP1: unrecognised operator falls through to default 'is' (eq/inArray) behaviour
  if (params.type) {
    const types = params.type.split(',').map((t) => t.trim());
    const op = params.type_op ?? 'is';
    if (types.length > 1) {
      conditions.push(
        op === 'is_not'
          ? notInArray(transactions.type, types as typeof transactions.type._.data[])
          : inArray(transactions.type, types as typeof transactions.type._.data[])
      );
    } else {
      conditions.push(
        op === 'is_not'
          ? ne(transactions.type, types[0] as typeof transactions.type._.data)
          : eq(transactions.type, types[0] as typeof transactions.type._.data)
      );
    }
  }

  // accountId
  if (params.accountId) {
    const op = params.accountId_op ?? 'is';
    conditions.push(
      op === 'is_not'
        ? ne(transactions.accountId, params.accountId)
        : eq(transactions.accountId, params.accountId)
    );
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
    if (params.dateFrom) conditions.push(gte(transactions.date, params.dateFrom));
    if (params.dateTo) conditions.push(lte(transactions.date, params.dateTo));
  }

  // categoryId — nullable column; supports empty/not_empty
  const catOp = params.categoryId_op ?? 'is';
  if (catOp === 'empty') {
    conditions.push(isNull(transactions.categoryId));
  } else if (catOp === 'not_empty') {
    conditions.push(isNotNull(transactions.categoryId));
  } else if (params.categoryId) {
    conditions.push(
      catOp === 'is_not'
        ? or(ne(transactions.categoryId, params.categoryId), isNull(transactions.categoryId))!
        : eq(transactions.categoryId, params.categoryId)
    );
  }

  // assigneeId — EXISTS subquery; supports empty/not_empty/is_not (T-03.4.1-OP2)
  const assigneeOp = params.assigneeId_op ?? 'is';
  const assigneeSubquery = db
    .select({ one: sql`1` })
    .from(transactionAssignees)
    .where(
      and(
        eq(transactionAssignees.transactionId, transactions.id),
        ...(params.assigneeId
          ? [eq(transactionAssignees.memberId, params.assigneeId)]
          : [])
      )
    );

  if (assigneeOp === 'empty') {
    conditions.push(not(exists(assigneeSubquery)));
  } else if (assigneeOp === 'not_empty') {
    conditions.push(exists(assigneeSubquery));
  } else if (params.assigneeId) {
    conditions.push(
      assigneeOp === 'is_not'
        ? not(exists(assigneeSubquery))
        : exists(assigneeSubquery)
    );
  }

  // tagIds — supports all 6 operators (T-03.4.1-OP3: includes_all bounded by practical UI)
  const tagOp = params.tagIds_op ?? 'is_any_of';
  if (tagOp === 'empty') {
    conditions.push(
      not(
        exists(
          db
            .select({ one: sql`1` })
            .from(transactionTags)
            .where(eq(transactionTags.transactionId, transactions.id))
        )
      )
    );
  } else if (tagOp === 'not_empty') {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(transactionTags)
          .where(eq(transactionTags.transactionId, transactions.id))
      )
    );
  } else if (params.tagIds && params.tagIds.length > 0) {
    if (tagOp === 'includes_all') {
      // One EXISTS subquery per tag ID — all must be present
      for (const tagId of params.tagIds) {
        conditions.push(
          exists(
            db
              .select({ one: sql`1` })
              .from(transactionTags)
              .where(
                and(
                  eq(transactionTags.transactionId, transactions.id),
                  eq(transactionTags.tagId, tagId)
                )
              )
          )
        );
      }
    } else if (tagOp === 'is_not_any_of' || tagOp === 'excludes_all') {
      conditions.push(
        not(
          exists(
            db
              .select({ one: sql`1` })
              .from(transactionTags)
              .where(
                and(
                  eq(transactionTags.transactionId, transactions.id),
                  inArray(transactionTags.tagId, params.tagIds)
                )
              )
          )
        )
      );
    } else {
      // is_any_of (default) — existing behaviour
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(transactionTags)
            .where(
              and(
                eq(transactionTags.transactionId, transactions.id),
                inArray(transactionTags.tagId, params.tagIds)
              )
            )
        )
      );
    }
  }

  // T-03.4-01: D-18 description filter — parameterized ILIKE (NOT string interpolation) — safe from SQL injection
  // '%' + value + '%' is passed as a Drizzle bound parameter to the DB driver, not concatenated into SQL text.
  // Searches both description (user-visible) and rawDescription (original bank/import memo).
  if (params.description) {
    conditions.push(
      sql`(${transactions.description} ILIKE ${'%' + params.description + '%'} OR ${transactions.rawDescription} ILIKE ${'%' + params.description + '%'})`
    );
  }
  return conditions;
}

// Paginated base rows query with joins to categories + accounts
export async function buildListQuery(params: ListQueryParams) {
  const conditions = buildConditions(params);
  const orderCol =
    params.sort === 'amount'    ? transactions.amount
    : params.sort === 'type'    ? transactions.type
    : params.sort === 'category' ? categories.name
    : params.sort === 'account'  ? accounts.name
    : transactions.date;
  const orderFn = params.order === 'asc' ? asc : desc;
  const offset = (params.page - 1) * params.limit;

  return db
    .select(TX_COLUMNS)
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(counterpartAccounts, eq(transactions.counterpartAccountId, counterpartAccounts.id))
    .leftJoin(refundSource, eq(transactions.refundOf, refundSource.id))
    .where(and(...conditions))
    .orderBy(orderFn(orderCol))
    .limit(params.limit)
    .offset(offset);
}

// Count query — returns total matching rows for pagination envelope (D-07)
export async function countQuery(params: ListQueryParams): Promise<number> {
  const conditions = buildConditions(params);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(...conditions));
  return total;
}

// Single transaction by id — same column projection as list (D-05)
export async function fetchTransactionById(id: string, orgId: string) {
  const rows = await db
    .select(TX_COLUMNS)
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(counterpartAccounts, eq(transactions.counterpartAccountId, counterpartAccounts.id))
    .leftJoin(refundSource, eq(transactions.refundOf, refundSource.id))
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.orgId, orgId),
        isNull(transactions.deletedAt) // D-15
      )
    )
    .limit(1);
  return rows.at(0) ?? null;
}

// Enrich a page of base rows with assignees and tags via parallel sub-queries.
// Avoids cartesian product from multi-level left joins (RESEARCH.md Pitfall 1).
export async function enrichTransactions(baseRows: { id: string }[]) {
  const txIds = baseRows.map((r) => r.id);
  if (txIds.length === 0) {
    return {
      assigneeMap: {} as Record<string, unknown[]>,
      tagMap: {} as Record<string, unknown[]>,
    };
  }

  // Pitfall 6: guard against inArray([]) which generates invalid SQL
  const [assigneeRows, tagRows] = await Promise.all([
    db
      .select({
        transactionId: transactionAssignees.transactionId,
        memberId: transactionAssignees.memberId,
        amountCents: transactionAssignees.amountCents,
        percentage: transactionAssignees.percentage, // string — display only
        memberName: orgMembers.displayName,
      })
      .from(transactionAssignees)
      .innerJoin(orgMembers, eq(transactionAssignees.memberId, orgMembers.id))
      .where(inArray(transactionAssignees.transactionId, txIds)),

    db
      .select({
        transactionId: transactionTags.transactionId,
        id: tags.id,
        name: tags.name,
        colour: tags.colour,
      })
      .from(transactionTags)
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .where(inArray(transactionTags.transactionId, txIds)),
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
}

// Validate counterpartAccountId belongs to the same org — T1 security mitigation (T-03.4.1-T1)
export async function counterpartAccountBelongsToOrg(
  accountId: string,
  orgId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.orgId, orgId)))
    .limit(1);
  return !!row;
}

// Validate that a refundOf transaction ID exists in the same org (D-13)
export async function refundOfExists(
  refundOfId: string,
  orgId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, refundOfId), eq(transactions.orgId, orgId)))
    .limit(1);
  return !!row;
}

// Soft-delete a transaction by setting deletedAt = now() (D-15).
// WHERE: eq(id) + eq(orgId) + isNull(deletedAt) — prevents cross-org and double-delete.
// Returns {id} on success or null if not found / wrong org / already deleted.
export async function softDeleteTransactionQuery(
  id: string,
  orgId: string
): Promise<{ id: string } | null> {
  const rows = await db
    .update(transactions)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.orgId, orgId),
        isNull(transactions.deletedAt)
      )
    )
    .returning({ id: transactions.id });
  return rows.at(0) ?? null;
}

// Restore a soft-deleted transaction by setting deletedAt = null (D-15).
// WHERE: eq(id) + eq(orgId) + isNotNull(deletedAt) — only restores actually-deleted rows (T-03.3-05).
// Returns {id} on success or null if not found / wrong org / already active.
export async function restoreTransactionQuery(
  id: string,
  orgId: string
): Promise<{ id: string } | null> {
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
}

// Update scalar columns for a transaction inside an outer db.transaction() (tx is passed in).
// WHERE: eq(id) + eq(orgId) + isNull(deletedAt) — Pitfall 7: 0 rows → returns null → caller sends 404.
// Returns the updated row or null if not found / wrong org / already deleted.
export async function updateTransactionScalarsQuery(
  tx: DrizzleTransaction,
  id: string,
  orgId: string,
  data: Record<string, unknown>
) {
  const rows = await tx
    .update(transactions)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.orgId, orgId),
        isNull(transactions.deletedAt)
      )
    )
    .returning();
  return rows.at(0) ?? null;
}

// Replace-all assignees for a transaction inside an outer db.transaction().
// D-03: always deletes existing rows first; inserts new ones if assignees is non-empty.
// percentage column is numeric — Drizzle expects string.
export async function replaceAssignees(
  tx: DrizzleTransaction,
  transactionId: string,
  assignees: {
    memberId: string;
    amountCents: number;
    percentage?: number | null;
  }[]
): Promise<void> {
  await tx
    .delete(transactionAssignees)
    .where(eq(transactionAssignees.transactionId, transactionId));
  if (assignees.length > 0) {
    await tx.insert(transactionAssignees).values(
      assignees.map((a) => ({
        transactionId,
        memberId: a.memberId,
        amountCents: a.amountCents,
        percentage: a.percentage != null ? a.percentage.toString() : null,
      }))
    );
  }
}

// Replace-all tags for a transaction inside an outer db.transaction().
// D-03: always deletes existing rows first; inserts new ones if tagIds is non-empty.
export async function replaceTags(
  tx: DrizzleTransaction,
  transactionId: string,
  tagIds: string[]
): Promise<void> {
  await tx
    .delete(transactionTags)
    .where(eq(transactionTags.transactionId, transactionId));
  if (tagIds.length > 0) {
    await tx
      .insert(transactionTags)
      .values(tagIds.map((tagId) => ({ transactionId, tagId })));
  }
}
