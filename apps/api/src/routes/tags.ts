import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { db } from '@ploutizo/db';
import { tags } from '@ploutizo/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { createTagSchema } from '@ploutizo/validators';

const tagsRouter = new Hono();

tagsRouter.get('/', async (c) => {
  const { orgId } = getAuth(c);
  const rows = await db
    .select()
    .from(tags)
    .where(and(eq(tags.orgId, orgId!), isNull(tags.archivedAt)))
    .orderBy(tags.name);
  return c.json({ data: rows });
});

tagsRouter.post('/', async (c) => {
  const { orgId } = getAuth(c);
  const result = createTagSchema.safeParse(await c.req.json());
  if (!result.success)
    return c.json(
      { error: { code: 'VALIDATION_ERROR', errors: result.error.issues } },
      400
    );
  const [row] = await db
    .insert(tags)
    .values({ orgId: orgId!, ...result.data })
    .returning();
  return c.json({ data: row }, 201);
});

tagsRouter.delete('/:id/archive', async (c) => {
  const { orgId } = getAuth(c);
  const id = c.req.param('id');
  const updated = await db
    .update(tags)
    .set({ archivedAt: new Date() })
    .where(and(eq(tags.id, id), eq(tags.orgId, orgId!)))
    .returning()
    .then((rows) => rows.at(0));
  if (!updated)
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Tag not found.' } },
      404
    );
  return c.json({ data: updated });
});

export { tagsRouter };
