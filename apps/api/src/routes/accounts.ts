import { Hono } from 'hono';
import { appValidator } from '../lib/validator';
import {
  archiveAccountById,
  createAccount,
  getAccountMembers,
  listAccounts,
  updateAccount,
} from '../services/accounts';
import {
  createAccountSchema,
  updateAccountSchema,
} from '@ploutizo/validators';
import type { AppEnv } from '../types';

const accountsRouter = new Hono<AppEnv>();

// GET / — returns accounts for the org, active only unless ?include=archived
accountsRouter.get('/', async (c) => {
  const orgId = c.get('orgId');
  const includeArchived = c.req.query('include') === 'archived';
  const rows = await listAccounts(orgId, includeArchived);
  return c.json({ data: rows });
});

// POST / — create account; optionally assign members
accountsRouter.post('/', appValidator('json', createAccountSchema), async (c) => {
  const orgId = c.get('orgId');
  const data = c.req.valid('json');
  const row = await createAccount(orgId, data);
  return c.json({ data: row }, 201);
});

// PATCH /:id — update account fields; replace members if memberIds provided
accountsRouter.patch('/:id', appValidator('json', updateAccountSchema), async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const updated = await updateAccount(id, orgId, data);
  return c.json({ data: updated });
});

// GET /:id/members — return current member rows for one account
accountsRouter.get('/:id/members', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const rows = await getAccountMembers(id, orgId);
  return c.json({ data: rows });
});

// DELETE /:id/archive — soft-archive the account by setting archivedAt
accountsRouter.delete('/:id/archive', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const updated = await archiveAccountById(id, orgId);
  return c.json({ data: updated });
});

export { accountsRouter };
