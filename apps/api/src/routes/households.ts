import { Hono } from 'hono';
import { getAuth } from '@clerk/hono';
import {
  InviteMemberFormSchema,
  updateHouseholdSettingsSchema,
} from '@ploutizo/validators';
import { appValidator } from '../lib/validator';
import {
  getHousehold,
  getHouseholdSettings,
  inviteMember,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  updateHouseholdSettings,
} from '../services/households';
import type { AppEnv } from '../types';

const householdsRouter = new Hono<AppEnv>();

// GET / — org overview (name, imageUrl)
householdsRouter.get('/', async (c) => {
  const orgId = c.get('orgId');
  const data = await getHousehold(orgId);
  return c.json({ data });
});

// GET /settings — returns the org's settlementThreshold
householdsRouter.get('/settings', async (c) => {
  const orgId = c.get('orgId');
  const data = await getHouseholdSettings(orgId);
  return c.json({ data });
});

// PATCH /settings — update the org's settlementThreshold
householdsRouter.patch(
  '/settings',
  appValidator('json', updateHouseholdSettingsSchema),
  async (c) => {
    const orgId = c.get('orgId');
    const data = c.req.valid('json');
    const result = await updateHouseholdSettings(orgId, data);
    return c.json({ data: result });
  }
);

// GET /members — list active members in current org
householdsRouter.get('/members', async (c) => {
  const orgId = c.get('orgId');
  const rows = await listMembers(orgId);
  return c.json({ data: rows });
});

// POST /invitations — invite a user to the org via Clerk API
householdsRouter.post(
  '/invitations',
  appValidator('json', InviteMemberFormSchema),
  async (c) => {
    const orgId = c.get('orgId');
    const data = c.req.valid('json');
    const result = await inviteMember(orgId, data);
    return c.json({ data: result });
  }
);

// DELETE /members/:memberId — remove a member from the org
// getAuth(c).userId is still valid here — tenantGuard only sets orgId, not userId (RESEARCH.md Pitfall 6)
householdsRouter.delete('/members/:memberId', async (c) => {
  const orgId = c.get('orgId');
  const { userId: callerClerkId } = getAuth(c);
  const { memberId } = c.req.param();
  const result = await removeMember(memberId, orgId, callerClerkId);
  return c.json({ data: result });
});

// GET /invitations — list pending and expired invitations for the current org
// SECURITY: orgId comes from c.get('orgId') (set by tenantGuard from JWT) — never from client
householdsRouter.get('/invitations', async (c) => {
  const orgId = c.get('orgId');
  const rows = await listInvitations(orgId);
  return c.json({ data: rows });
});

// DELETE /invitations/:invitationId — revoke an invitation (calls Clerk POST .../revoke under the hood)
// SECURITY: orgId from JWT scope, userId from JWT — both server-set, never client-controllable
householdsRouter.delete('/invitations/:invitationId', async (c) => {
  const orgId = c.get('orgId');
  const { userId: requestingUserId } = getAuth(c);
  const { invitationId } = c.req.param();
  const result = await revokeInvitation(
    orgId,
    invitationId,
    requestingUserId ?? ''
  );
  return c.json({ data: result });
});

export { householdsRouter };
