import { db } from '@ploutizo/db';
import { tags } from '@ploutizo/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

// GET / — list active tags for org
export async function listTags(orgId: string) {
  return db
    .select()
    .from(tags)
    .where(and(eq(tags.orgId, orgId), isNull(tags.archivedAt)))
    .orderBy(tags.name);
}

// POST / — insert tag; returns inserted row
export async function insertTag(
  orgId: string,
  data: Omit<typeof tags.$inferInsert, 'orgId' | 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>
) {
  const [row] = await db.insert(tags).values({ orgId, ...data }).returning();
  return row;
}

// DELETE /:id/archive — soft-archive tag; returns updated row or null
export async function archiveTag(id: string, orgId: string) {
  const rows = await db
    .update(tags)
    .set({ archivedAt: new Date() })
    .where(and(eq(tags.id, id), eq(tags.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
}
