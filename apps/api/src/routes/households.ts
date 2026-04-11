import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { db } from '@ploutizo/db';
import { orgMembers, orgs, users } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';
import { updateHouseholdSettingsSchema } from '@ploutizo/validators';

const householdsRouter = new Hono();

// GET /settings — returns the org's settlementThreshold
householdsRouter.get('/settings', async (c) => {
  const { orgId } = getAuth(c);
  const row = await db
    .select({ settlementThreshold: orgs.settlementThreshold })
    .from(orgs)
    .where(eq(orgs.id, orgId!))
    .then((rows) => rows.at(0));
  return c.json({
    data: { settlementThreshold: row?.settlementThreshold ?? null },
  });
});

// PATCH /settings — update the org's settlementThreshold
householdsRouter.patch('/settings', async (c) => {
  const { orgId } = getAuth(c);
  const result = updateHouseholdSettingsSchema.safeParse(await c.req.json());
  if (!result.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', errors: result.error.issues } },
      400
    );
  }
  const updated = await db
    .update(orgs)
    .set({
      settlementThreshold: result.data.settlementThreshold,
      updatedAt: new Date(),
    })
    .where(eq(orgs.id, orgId!))
    .returning()
    .then((rows) => rows.at(0));
  return c.json({
    data: { settlementThreshold: updated?.settlementThreshold ?? null },
  });
});

// GET /members — list active members in current org (for co-owner picker)
householdsRouter.get('/members', async (c) => {
  const { orgId } = getAuth(c);
  const rows = await db
    .select({
      id: orgMembers.id,
      orgId: orgMembers.orgId,
      displayName: orgMembers.displayName,
      role: orgMembers.role,
      joinedAt: orgMembers.joinedAt,
      externalId: users.externalId,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, orgId!))
    .orderBy(orgMembers.displayName);
  return c.json({ data: rows });
});

export { householdsRouter };
