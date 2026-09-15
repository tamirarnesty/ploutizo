import { Hono as HonoConstructor } from 'hono';
import { registerApiErrorHandlers } from '../lib/apiErrorResponse';
import type { Mock } from 'vitest';
import type { Hono } from 'hono';
import type { AppEnv, HouseholdPrincipal } from '../types';

/** Narrow shape for mocks passed to `db.transaction` callbacks in API tests. */
export type MockDbTransactionClient = {
  select: Mock;
  insert: Mock;
  delete: Mock;
  update: Mock;
};

export const TEST_HOUSEHOLD_PRINCIPAL: HouseholdPrincipal = {
  signedInMemberId: 'user_clerk_abc',
  activeHouseholdId: 'org_test123',
};

/** Route test app with a default household principal plus shared error handlers. */
export const createRouteTestApp = (
  configure: (testApp: Hono<AppEnv>) => void,
  principal: HouseholdPrincipal = TEST_HOUSEHOLD_PRINCIPAL
): Hono<AppEnv> => {
  const app = new HonoConstructor<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('principal', principal);
    await next();
  });
  configure(app);
  registerApiErrorHandlers(app);
  return app;
};
