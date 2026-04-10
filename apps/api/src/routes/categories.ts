import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { db } from '@ploutizo/db';
import { categories } from '@ploutizo/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import {
  createCategorySchema,
  reorderSchema,
  updateCategorySchema,
} from '@ploutizo/validators';

const categoriesRouter = new Hono();

// IMPORTANT: /reorder must be registered BEFORE /:id to prevent ':id' capturing 'reorder'
categoriesRouter.patch('/reorder', async (c) => {
  const { orgId } = getAuth(c);
  const result = reorderSchema.safeParse(await c.req.json());
  if (!result.success)
    return c.json(
      { error: { code: 'VALIDATION_ERROR', errors: result.error.issues } },
      400
    );
  await db.transaction(async (tx) => {
    for (let i = 0; i < result.data.orderedIds.length; i++) {
      await tx
        .update(categories)
        .set({ sortOrder: i })
        .where(
          and(
            eq(categories.id, result.data.orderedIds[i]),
            eq(categories.orgId, orgId!)
          )
        );
    }
  });
  return c.json({ data: { ok: true } });
});

categoriesRouter.get('/', async (c) => {
  const { orgId } = getAuth(c);
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.orgId, orgId!), isNull(categories.archivedAt)))
    .orderBy(categories.sortOrder);
  return c.json({ data: rows });
});

categoriesRouter.post('/', async (c) => {
  const { orgId } = getAuth(c);
  const result = createCategorySchema.safeParse(await c.req.json());
  if (!result.success)
    return c.json(
      { error: { code: 'VALIDATION_ERROR', errors: result.error.issues } },
      400
    );
  const [row] = await db
    .insert(categories)
    .values({ orgId: orgId!, ...result.data })
    .returning();
  return c.json({ data: row }, 201);
});

categoriesRouter.patch('/:id', async (c) => {
  const { orgId } = getAuth(c);
  const id = c.req.param('id');
  const result = updateCategorySchema.safeParse(await c.req.json());
  if (!result.success)
    return c.json(
      { error: { code: 'VALIDATION_ERROR', errors: result.error.issues } },
      400
    );
  const updated = await db
    .update(categories)
    .set(result.data)
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId!)))
    .returning()
    .then((rows) => rows.at(0));
  if (!updated)
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Category not found.' } },
      404
    );
  return c.json({ data: updated });
});

categoriesRouter.delete('/:id/archive', async (c) => {
  const { orgId } = getAuth(c);
  const id = c.req.param('id');
  const updated = await db
    .update(categories)
    .set({ archivedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId!)))
    .returning()
    .then((rows) => rows.at(0));
  if (!updated)
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Category not found.' } },
      404
    );
  return c.json({ data: updated });
});

export { categoriesRouter };
