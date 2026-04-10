import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { db } from '@ploutizo/db';
import { merchantRules } from '@ploutizo/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  createMerchantRuleSchema,
  reorderSchema,
  updateMerchantRuleSchema,
} from '@ploutizo/validators';

const merchantRulesRouter = new Hono();

// IMPORTANT: /reorder must be registered BEFORE /:id to prevent ':id' capturing 'reorder'
merchantRulesRouter.patch('/reorder', async (c) => {
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
        .update(merchantRules)
        .set({ priority: i })
        .where(
          and(
            eq(merchantRules.id, result.data.orderedIds[i]),
            eq(merchantRules.orgId, orgId!)
          )
        );
    }
  });
  return c.json({ data: { ok: true } });
});

merchantRulesRouter.get('/', async (c) => {
  const { orgId } = getAuth(c);
  const rows = await db
    .select()
    .from(merchantRules)
    .where(eq(merchantRules.orgId, orgId!))
    .orderBy(merchantRules.priority);
  return c.json({ data: rows });
});

const validateRegexIfNeeded = (matchType: string, pattern: string): boolean => {
  if (matchType !== 'regex') return true;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

merchantRulesRouter.post('/', async (c) => {
  const { orgId } = getAuth(c);
  const result = createMerchantRuleSchema.safeParse(await c.req.json());
  if (!result.success)
    return c.json(
      { error: { code: 'VALIDATION_ERROR', errors: result.error.issues } },
      400
    );
  if (!validateRegexIfNeeded(result.data.matchType, result.data.pattern)) {
    return c.json(
      {
        error: {
          code: 'INVALID_REGEX',
          message: 'Invalid regular expression.',
        },
      },
      400
    );
  }
  const [row] = await db
    .insert(merchantRules)
    .values({ orgId: orgId!, ...result.data })
    .returning();
  return c.json({ data: row }, 201);
});

merchantRulesRouter.patch('/:id', async (c) => {
  const { orgId } = getAuth(c);
  const id = c.req.param('id');
  const result = updateMerchantRuleSchema.safeParse(await c.req.json());
  if (!result.success)
    return c.json(
      { error: { code: 'VALIDATION_ERROR', errors: result.error.issues } },
      400
    );
  if (
    result.data.matchType &&
    result.data.pattern &&
    !validateRegexIfNeeded(result.data.matchType, result.data.pattern)
  ) {
    return c.json(
      {
        error: {
          code: 'INVALID_REGEX',
          message: 'Invalid regular expression.',
        },
      },
      400
    );
  }
  const updated = await db
    .update(merchantRules)
    .set(result.data)
    .where(and(eq(merchantRules.id, id), eq(merchantRules.orgId, orgId!)))
    .returning()
    .then((rows) => rows.at(0));
  if (!updated)
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Rule not found.' } },
      404
    );
  return c.json({ data: updated });
});

merchantRulesRouter.delete('/:id', async (c) => {
  const { orgId } = getAuth(c);
  const id = c.req.param('id');
  await db
    .delete(merchantRules)
    .where(and(eq(merchantRules.id, id), eq(merchantRules.orgId, orgId!)));
  return new Response(null, { status: 204 });
});

export { merchantRulesRouter };
