import { db } from '@ploutizo/db';
import { accountMembers, accounts, orgMembers } from '@ploutizo/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';

// Drizzle transaction type for functions that participate in an outer db.transaction().
export type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// GET / — list accounts for org; active only unless includeArchived=true
export async function listAccounts(orgId: string, includeArchived: boolean) {
  const condition = includeArchived
    ? eq(accounts.orgId, orgId)
    : and(eq(accounts.orgId, orgId), isNull(accounts.archivedAt));
  return db
    .select()
    .from(accounts)
    .where(condition)
    .orderBy(accounts.createdAt);
}

// POST / — insert account row
export async function insertAccount(
  tx: DrizzleTransaction,
  orgId: string,
  data: Omit<typeof accounts.$inferInsert, 'orgId' | 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>
) {
  const [row] = await tx
    .insert(accounts)
    .values({ orgId, ...data })
    .returning();
  return row;
}

// POST / — insert account member rows in batch
export async function insertAccountMembers(
  tx: DrizzleTransaction,
  accountId: string,
  memberIds: string[]
) {
  if (memberIds.length === 0) return;
  await tx
    .insert(accountMembers)
    .values(memberIds.map((memberId) => ({ accountId, memberId })));
}

// PATCH /:id — update account scalar fields; returns updated row or null
export async function updateAccount(
  tx: DrizzleTransaction,
  id: string,
  orgId: string,
  data: Partial<typeof accounts.$inferInsert>
) {
  const rows = await tx
    .update(accounts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(accounts.id, id), eq(accounts.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
}

// PATCH /:id — replace all member rows for an account
export async function replaceAccountMembers(
  tx: DrizzleTransaction,
  accountId: string,
  memberIds: string[]
) {
  await tx.delete(accountMembers).where(eq(accountMembers.accountId, accountId));
  if (memberIds.length > 0) {
    await tx
      .insert(accountMembers)
      .values(memberIds.map((memberId) => ({ accountId, memberId })));
  }
}

// GET /:id/members — verify account belongs to org (for member endpoint scope check)
export async function fetchAccountById(id: string, orgId: string) {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.orgId, orgId)))
    .limit(1);
  return rows.at(0) ?? null;
}

// GET /:id/members — list members of an account
export async function listAccountMembers(accountId: string) {
  return db
    .select()
    .from(accountMembers)
    .where(eq(accountMembers.accountId, accountId));
}

// GET / enrichment — fetch member display names for a set of account IDs.
// Guard: inArray([]) generates invalid SQL in some Drizzle/PG versions (Pitfall 4).
export async function listAccountMemberDetails(accountIds: string[]) {
  if (accountIds.length === 0) return [];
  return db
    .select({
      accountId: accountMembers.accountId,
      memberId: orgMembers.id,
      displayName: orgMembers.displayName,
      imageUrl: orgMembers.imageUrl,
    })
    .from(accountMembers)
    .innerJoin(orgMembers, eq(orgMembers.id, accountMembers.memberId))
    .where(inArray(accountMembers.accountId, accountIds));
}

// DELETE /:id/archive — soft-archive account; returns updated row or null
export async function archiveAccount(id: string, orgId: string) {
  const rows = await db
    .update(accounts)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(accounts.id, id), eq(accounts.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
}
