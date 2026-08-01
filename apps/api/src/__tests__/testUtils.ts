import { Hono as HonoConstructor } from 'hono';
import { registerApiErrorHandlers } from '../lib/apiErrorResponse';
import type { Mock } from 'vitest';
import type { Env, Hono } from 'hono';

/** Narrow shape for mocks passed to `db.transaction` callbacks in API tests. */
export type MockDbTransactionClient = {
  insert: Mock;
  delete: Mock;
  update: Mock;
};

/** Route test app with shared notFound + onError handlers (matches production). */
export const createRouteTestApp = <TEnv extends Env>(
  configure: (testApp: Hono<TEnv>) => void
): Hono<TEnv> => {
  const app = new HonoConstructor<TEnv>();
  configure(app);
  registerApiErrorHandlers(app);
  return app;
};
