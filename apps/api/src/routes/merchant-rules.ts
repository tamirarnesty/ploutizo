import { Hono } from 'hono';
import {
  createMerchantRuleSchema,
  reorderSchema,
  updateMerchantRuleSchema,
} from '@ploutizo/validators';
import { appValidator } from '../lib/validator';
import {
  createMerchantRule,
  deleteMerchantRule,
  listMerchantRules,
  reorderMerchantRules,
  updateMerchantRule,
} from '../services/merchant-rules';
import type { AppEnv } from '../types';

const merchantRulesRouter = new Hono<AppEnv>();

// IMPORTANT: /reorder must be registered BEFORE /:id to prevent ':id' capturing 'reorder'
merchantRulesRouter.patch('/reorder', appValidator('json', reorderSchema), async (c) => {
  const orgId = c.get('orgId');
  const { orderedIds } = c.req.valid('json');
  await reorderMerchantRules(orgId, orderedIds);
  return c.json({ data: { ok: true } });
});

merchantRulesRouter.get('/', async (c) => {
  const orgId = c.get('orgId');
  const rows = await listMerchantRules(orgId);
  return c.json({ data: rows });
});

merchantRulesRouter.post('/', appValidator('json', createMerchantRuleSchema), async (c) => {
  const orgId = c.get('orgId');
  const data = c.req.valid('json');
  const row = await createMerchantRule(orgId, data);
  return c.json({ data: row }, 201);
});

merchantRulesRouter.patch('/:id', appValidator('json', updateMerchantRuleSchema), async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const updated = await updateMerchantRule(id, orgId, data);
  return c.json({ data: updated });
});

merchantRulesRouter.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  await deleteMerchantRule(id, orgId);
  return new Response(null, { status: 204 });
});

export { merchantRulesRouter };
