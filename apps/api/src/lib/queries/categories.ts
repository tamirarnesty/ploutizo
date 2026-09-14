import { db } from '@ploutizo/db';
import { categories } from '@ploutizo/db/schema';
import { and } from 'drizzle-orm';
import type { Transaction } from '@ploutizo/db';
import {
  activeCategories,
  categoriesForOrg,
  categoryInOrg,
} from '@/lib/queries/scope';

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
      .where(categoryInOrg(orgId, orderedIds[i]));
  }
};

// GET / — list categories for org (active only unless includeArchived)
export const listCategories = async (
  orgId: string,
  options?: { includeArchived?: boolean }
) => {
  const conditions = options?.includeArchived
    ? categoriesForOrg(orgId)
    : activeCategories(orgId);
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
    .where(categoryInOrg(orgId, id))
    .returning();
  return rows.at(0) ?? null;
};

// DELETE /:id/archive — soft-archive category; returns updated row or null
export const archiveCategory = async (id: string, orgId: string) => {
  const rows = await db
    .update(categories)
    .set({ archivedAt: new Date() })
    .where(categoryInOrg(orgId, id))
    .returning();
  return rows.at(0) ?? null;
};

// PATCH /:id/restore — unarchive category; returns updated row or null
export const restoreCategory = async (id: string, orgId: string) => {
  const rows = await db
    .update(categories)
    .set({ archivedAt: null })
    .where(categoryInOrg(orgId, id, { requireArchived: true }))
    .returning();
  return rows.at(0) ?? null;
};
