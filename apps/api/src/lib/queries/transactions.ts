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
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
// Drizzle transaction type for functions that participate in an outer db.transaction().
// Derived from db's own inference so it stays correct across schema changes.
export type DrizzleTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

// D-04: full column projection for joined transaction rows
const TX_COLUMNS = {
  id: transactions.id,
  orgId: transactions.orgId,
  type: transactions.type,
  amount: transactions.amount,
  date: transactions.date,
  description: transactions.description,
  merchant: transactions.merchant,
  categoryId: transactions.categoryId,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  accountId: transactions.accountId,
  accountName: accounts.name,
  accountType: accounts.type,
  refundOf: transactions.refundOf,
  incomeType: transactions.incomeType,
  incomeSource: transactions.incomeSource,
  toAccountId: transactions.toAccountId,
  settledAccountId: transactions.settledAccountId,
  investmentType: transactions.investmentType,
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
  /** D-18: case-insensitive substring match on description OR merchant — T-03.4-01 */
  description?: string;
};

// Build the WHERE conditions array for list + count queries
export function buildConditions(params: ListQueryParams): SQL[] {
  const conditions: SQL[] = [
    eq(transactions.orgId, params.orgId),
    isNull(transactions.deletedAt), // D-15
  ];
  if (params.type) {
    conditions.push(
      eq(transactions.type, params.type as typeof transactions.type._.data)
    );
  }
  if (params.accountId)
    conditions.push(eq(transactions.accountId, params.accountId));
  if (params.dateFrom) conditions.push(gte(transactions.date, params.dateFrom));
  if (params.dateTo) conditions.push(lte(transactions.date, params.dateTo));
  if (params.categoryId)
    conditions.push(eq(transactions.categoryId, params.categoryId));
  if (params.assigneeId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(transactionAssignees)
          .where(
            and(
              eq(transactionAssignees.transactionId, transactions.id),
              eq(transactionAssignees.memberId, params.assigneeId)
            )
          )
      )
    );
  }
  if (params.tagIds && params.tagIds.length > 0) {
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
  // T-03.4-01: D-18 description filter — parameterized ILIKE (NOT string interpolation) — safe from SQL injection
  // '%' + value + '%' is passed as a Drizzle bound parameter to the DB driver, not concatenated into SQL text.
  if (params.description) {
    conditions.push(
      sql`(${transactions.description} ILIKE ${'%' + params.description + '%'} OR ${transactions.merchant} ILIKE ${'%' + params.description + '%'})`
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
