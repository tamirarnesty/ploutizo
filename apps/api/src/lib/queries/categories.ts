import { db } from '@ploutizo/db';
import { categories } from '@ploutizo/db/schema';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Transaction } from '@ploutizo/db';

// PATCH /reorder — update sortOrder for each id in sequence
export const reorderCategories = async (
  tx: Transaction,
  orgId: string,
  orderedIds: string[]
) => {
  for (let i = 0; i < orderedIds.length; i++) {
    await tx
      .update(categories)
      .set({ sortOrder: i })
      .where(
        and(eq(categories.id, orderedIds[i]), eq(categories.orgId, orgId))
      );
  }
};

// GET / — list categories for org (active only unless includeArchived)
export const listCategories = async (
  orgId: string,
  options?: { includeArchived?: boolean }
) => {
  const conditions = [eq(categories.orgId, orgId)];
  if (!options?.includeArchived) {
    conditions.push(isNull(categories.archivedAt));
  }
  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(categories.sortOrder);
};

// POST / — insert category; returns inserted row
export const insertCategory = async (
  orgId: string,
  data: Omit<
    typeof categories.$inferInsert,
    'orgId' | 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'
  >
) => {
  const [row] = await db
    .insert(categories)
    .values({ orgId, ...data })
    .returning();
  return row;
};

// PATCH /:id — update category fields; returns updated row or null
export const updateCategory = async (
  id: string,
  orgId: string,
  data: Partial<typeof categories.$inferInsert>
) => {
  const rows = await db
    .update(categories)
    .set({ ...data })
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
};

// DELETE /:id/archive — soft-archive category; returns updated row or null
export const archiveCategory = async (id: string, orgId: string) => {
  const rows = await db
    .update(categories)
    .set({ archivedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
};

// PATCH /:id/restore — unarchive category; returns updated row or null
export const restoreCategory = async (id: string, orgId: string) => {
  const rows = await db
    .update(categories)
    .set({ archivedAt: null })
    .where(
      and(
        eq(categories.id, id),
        eq(categories.orgId, orgId),
        isNotNull(categories.archivedAt)
      )
    )
    .returning();
  return rows.at(0) ?? null;
};
