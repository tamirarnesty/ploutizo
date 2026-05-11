import { Hono } from 'hono';
import { createSettlementSchema } from '@ploutizo/validators';
import { appValidator } from '../lib/validator';
import {
  createSettlement,
  getSettlementBalances,
} from '../services/settlements';
import type { AppEnv } from '../types';

const settlementsRouter = new Hono<AppEnv>();

// GET / — settlement balances per account, per member (D-02)
settlementsRouter.get('/', async (c) => {
  const orgId = c.get('orgId');
  const result = await getSettlementBalances(orgId);
  return c.json(result);
});

// POST / — record a settlement payment (D-03)
settlementsRouter.post(
  '/',
  appValidator('json', createSettlementSchema),
  async (c) => {
    const orgId = c.get('orgId');
    const data = c.req.valid('json');
    const row = await createSettlement(orgId, data);
    return c.json({ data: row }, 201);
  }
);

export { settlementsRouter };
