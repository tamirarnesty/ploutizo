import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { clerkMiddleware } from '@clerk/hono';
import { closeDb } from '@ploutizo/db';
import { tenantGuard } from './middleware/tenantGuard';
import { authorizedPartyGuard } from './middleware/authorizedPartyGuard';
import { resolveAllowedOrigin } from './lib/allowedOrigins';
import { healthRouter } from './routes/health';
import { webhooksRouter } from './routes/webhooks';
import { accountsRouter } from './routes/accounts';
import { householdsRouter } from './routes/households';
import { categoriesRouter } from './routes/categories';
import { tagsRouter } from './routes/tags';
import { merchantRulesRouter } from './routes/merchant-rules';
import { transactionsRouter } from './routes/transactions';
import { settlementsRouter } from './routes/settlements';
import { importsRouter } from './routes/imports';
import { registerApiErrorHandlers } from './lib/apiErrorResponse';
import {
  TELEMETRY_EXPOSE_HEADERS,
  initApiOtel,
  requestTelemetry,
  shutdownApiOtel,
} from './telemetry';
import { createApiShutdown } from './serverLifecycle';
import type { Server } from 'node:http';
import type { AppEnv } from './types';

/** Below serverShutdownTimeoutMs so idle keep-alive sockets expire during drain. */
const KEEP_ALIVE_TIMEOUT_MS = 2_000;
/** Node requires headersTimeout > keepAliveTimeout. */
const HEADERS_TIMEOUT_MS = 10_000;

// Boot OTel exporters before request handling (non-blocking; failures degrade).
initApiOtel();

const app = new Hono<AppEnv>();

// Invariant middleware order (docs/stack-and-conventions.md):
// CORS → request telemetry → Clerk → authorized party guard → tenant guard
// 1. CORS — handles preflight before Clerk so OPTIONS requests are not rejected
app.use(
  '*',
  cors({
    origin: (origin) => resolveAllowedOrigin(origin),
    credentials: true,
    exposeHeaders: [...TELEMETRY_EXPOSE_HEADERS],
  })
);

// 1b. Request telemetry — after CORS, before Clerk (PLO-64)
app.use('*', requestTelemetry());

// 2. Clerk JWT verification — clockSkewInMs handles Railway container clock drift (D-04)
// azp validation uses authorizedPartyGuard + isAllowedParty so Railway PR preview
// origins can be allowlisted without a static string[].
app.use(
  '*',
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    clockSkewInMs: 10000,
  })
);

app.use('*', authorizedPartyGuard());

// 3. Tenant guard — scoped to /api/* ONLY (not /health, not /webhooks)
app.use('/api/*', tenantGuard());

// Routes excluded from tenant guard
app.route('/health', healthRouter);
app.route('/webhooks', webhooksRouter);

// Protected API routes (tenant guard enforced via /api/* middleware above)
app.route('/api/accounts', accountsRouter);
app.route('/api/households', householdsRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/tags', tagsRouter);
app.route('/api/merchant-rules', merchantRulesRouter);
app.route('/api/transactions', transactionsRouter);
app.route('/api/settlements', settlementsRouter);
app.route('/api/imports', importsRouter);

// Centralized error handler (D-04) — registered AFTER routes, BEFORE serve()
registerApiErrorHandlers(app);

const server = serve({
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 8080),
});
(server as Server).keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
(server as Server).headersTimeout = HEADERS_TIMEOUT_MS;

const shutdown = createApiShutdown({
  server,
  shutdownResources: closeDb,
  shutdownTelemetry: shutdownApiOtel,
  exit: (code) => process.exit(code),
});

process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
