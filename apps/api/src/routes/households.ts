import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { db } from '@ploutizo/db';
import { orgMembers, orgs, users } from '@ploutizo/db/schema';
import { and, eq } from 'drizzle-orm';
import { updateHouseholdSettingsSchema } from '@ploutizo/validators';

const householdsRouter = new Hono();

// GET / — org overview (name, imageUrl)
householdsRouter.get('/', async (c) => {
  const { orgId } = getAuth(c);
  const row = await db
    .select({ name: orgs.name, imageUrl: orgs.imageUrl })
    .from(orgs)
    .where(eq(orgs.id, orgId!))
    .then((rows) => rows.at(0));
  return c.json({ data: { name: row?.name ?? null, imageUrl: row?.imageUrl ?? null } });
});

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

// GET /members — list active members in current org (includes imageUrl, firstName, lastName for avatar rendering)
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
      imageUrl: users.imageUrl,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, orgId!))
    .orderBy(orgMembers.displayName);
  return c.json({ data: rows });
});

// POST /invitations — invite a user to the org via Clerk API
householdsRouter.post('/invitations', async (c) => {
  const { orgId } = getAuth(c);
  const { email } = await c.req.json();

  const clerkRes = await fetch(
    `https://api.clerk.com/v1/organizations/${orgId}/invitations`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_address: email, role: 'org:admin' }),
    }
  );

  if (!clerkRes.ok) {
    const clerkBody = await clerkRes.json() as { errors?: Array<{ code: string }> };
    const code = clerkBody.errors?.[0]?.code;
    if (code === 'already_a_member_of_this_org') {
      return c.json({ error: { code: 'ALREADY_MEMBER' } }, 409);
    }
    if (code === 'invitation_already_pending') {
      return c.json({ error: { code: 'INVITATION_PENDING' } }, 409);
    }
    return c.json({ error: { code: 'INVALID_EMAIL' } }, 400);
  }

  return c.json({ data: { sent: true } });
});

// DELETE /members/:memberId — remove a member from the org
householdsRouter.delete('/members/:memberId', async (c) => {
  const { orgId, userId: callerClerkId } = getAuth(c);
  const { memberId } = c.req.param();

  // Look up local member row to get externalId for Clerk API call
  const member = await db
    .select({ externalId: users.externalId })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId!)))
    .then((r) => r.at(0));

  if (!member) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }

  // Server-side self-removal guard (T-03.2.1-02-01)
  if (member.externalId === callerClerkId) {
    return c.json({ error: { code: 'SELF_REMOVAL_FORBIDDEN' } }, 403);
  }

  // Remove from Clerk org
  await fetch(
    `https://api.clerk.com/v1/organizations/${orgId}/memberships/${member.externalId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    }
  );

  // Remove local org_members row
  await db.delete(orgMembers).where(eq(orgMembers.id, memberId));

  return c.json({ data: { removed: true } });
});

export { householdsRouter };
