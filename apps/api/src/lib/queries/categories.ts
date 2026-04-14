import { db } from '@ploutizo/db';
import { categories } from '@ploutizo/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

// Drizzle transaction type for functions that participate in an outer db.transaction().
export type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// PATCH /reorder — update sortOrder for each id in sequence
export async function reorderCategories(
  tx: DrizzleTransaction,
  orgId: string,
  orderedIds: string[]
) {
  for (let i = 0; i < orderedIds.length; i++) {
    await tx
      .update(categories)
      .set({ sortOrder: i })
      .where(and(eq(categories.id, orderedIds[i]), eq(categories.orgId, orgId)));
  }
}

// GET / — list active categories for org
export async function listCategories(orgId: string) {
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.orgId, orgId), isNull(categories.archivedAt)))
    .orderBy(categories.sortOrder);
}

// POST / — insert category; returns inserted row
export async function insertCategory(
  orgId: string,
  data: Omit<typeof categories.$inferInsert, 'orgId' | 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>
) {
  const [row] = await db
    .insert(categories)
    .values({ orgId, ...data })
    .returning();
  return row;
}

// PATCH /:id — update category fields; returns updated row or null
export async function updateCategory(
  id: string,
  orgId: string,
  data: Partial<typeof categories.$inferInsert>
) {
  const rows = await db
    .update(categories)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
}

// DELETE /:id/archive — soft-archive category; returns updated row or null
export async function archiveCategory(id: string, orgId: string) {
  const rows = await db
    .update(categories)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
}
