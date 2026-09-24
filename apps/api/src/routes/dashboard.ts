import { Hono } from 'hono';
import { dashboardOverviewQuerySchema } from '@ploutizo/validators';
import { resolveOverviewQueryRange } from '@ploutizo/utils/dashboard-period';
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
    const resolved = resolveOverviewQueryRange(query.from, query.to);
    if (resolved === 'invalid') {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid overview period parameters',
          },
        },
        400
      );
    }
    const result = await getDashboardOverview(orgId, resolved);
    return c.json(result);
  }
);

export { dashboardRouter };
