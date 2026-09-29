import { Hono } from 'hono';
import { dashboardOverviewQuerySchema } from '@ploutizo/validators';
import { appValidator } from '../lib/validator';
import { getDashboardOverview } from '../services/dashboard';
import type { AppEnv } from '../types';

const dashboardRouter = new Hono<AppEnv>();

dashboardRouter.get(
  '/overview',
  appValidator('query', dashboardOverviewQuerySchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const query = c.req.valid('query');
    return c.json(await getDashboardOverview(orgId, query));
  }
);

export { dashboardRouter };
