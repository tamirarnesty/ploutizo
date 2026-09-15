import { Hono } from 'hono';
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
  const orgId = c.get('principal').activeHouseholdId;
  const data = await getHousehold(orgId);
  return c.json({ data });
});

// GET /settings — returns the org's settlementThreshold
householdsRouter.get('/settings', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const data = await getHouseholdSettings(orgId);
  return c.json({ data });
});

// PATCH /settings — update the org's settlementThreshold
householdsRouter.patch(
  '/settings',
  appValidator('json', updateHouseholdSettingsSchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const data = c.req.valid('json');
    const result = await updateHouseholdSettings(orgId, data);
    return c.json({ data: result });
  }
);

// GET /members — list active members in current org
householdsRouter.get('/members', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const rows = await listMembers(orgId);
  return c.json({ data: rows });
});

// POST /invitations — invite a user to the org via Clerk API
householdsRouter.post(
  '/invitations',
  appValidator('json', InviteMemberFormSchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const data = c.req.valid('json');
    const result = await inviteMember(orgId, data);
    return c.json({ data: result });
  }
);

// DELETE /members/:memberId — remove a member from the household
householdsRouter.delete('/members/:memberId', async (c) => {
  const { signedInMemberId, activeHouseholdId } = c.get('principal');
  const { memberId } = c.req.param();
  const result = await removeMember(
    memberId,
    activeHouseholdId,
    signedInMemberId
  );
  return c.json({ data: result });
});

// GET /invitations — list pending and expired invitations for the current household
// SECURITY: household id comes from the verified principal — never from the client
householdsRouter.get('/invitations', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const rows = await listInvitations(orgId);
  return c.json({ data: rows });
});

// DELETE /invitations/:invitationId — revoke an invitation (calls Clerk POST .../revoke under the hood)
// SECURITY: household id and signed-in member id are server-set from verified claims
householdsRouter.delete('/invitations/:invitationId', async (c) => {
  const { signedInMemberId, activeHouseholdId } = c.get('principal');
  const { invitationId } = c.req.param();
  const result = await revokeInvitation(
    activeHouseholdId,
    invitationId,
    signedInMemberId
  );
  return c.json({ data: result });
});

export { householdsRouter };
