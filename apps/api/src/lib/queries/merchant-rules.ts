import { db } from '@ploutizo/db';
import { merchantRules } from '@ploutizo/db/schema';
import { and, eq } from 'drizzle-orm';

// Drizzle transaction type for functions that participate in an outer db.transaction().
export type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// PATCH /reorder — update priority for each id in sequence
export async function reorderMerchantRules(
  tx: DrizzleTransaction,
  orgId: string,
  orderedIds: string[]
) {
  for (let i = 0; i < orderedIds.length; i++) {
    await tx
      .update(merchantRules)
      .set({ priority: i })
      .where(and(eq(merchantRules.id, orderedIds[i]), eq(merchantRules.orgId, orgId)));
  }
}

// GET / — list all rules for org ordered by priority
export async function listMerchantRules(orgId: string) {
  return db
    .select()
    .from(merchantRules)
    .where(eq(merchantRules.orgId, orgId))
    .orderBy(merchantRules.priority);
}

// POST / — insert rule; returns inserted row
export async function insertMerchantRule(
  orgId: string,
  data: Omit<typeof merchantRules.$inferInsert, 'orgId' | 'id' | 'createdAt' | 'updatedAt'>
) {
  const [row] = await db
    .insert(merchantRules)
    .values({ orgId, ...data })
    .returning();
  return row;
}

// PATCH /:id — update rule fields; returns updated row or null
export async function updateMerchantRule(
  id: string,
  orgId: string,
  data: Partial<typeof merchantRules.$inferInsert>
) {
  const rows = await db
    .update(merchantRules)
    .set(data)
    .where(and(eq(merchantRules.id, id), eq(merchantRules.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
}

// DELETE /:id — hard delete rule
export async function deleteMerchantRule(id: string, orgId: string) {
  await db
    .delete(merchantRules)
    .where(and(eq(merchantRules.id, id), eq(merchantRules.orgId, orgId)));
}
