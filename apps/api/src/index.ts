import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { clerkMiddleware } from '@clerk/hono';
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
import { DomainError, NotFoundError } from './lib/errors';
import type { AppEnv } from './types';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const app = new Hono<AppEnv>();

// Invariant middleware order (docs/stack-and-conventions.md):
// CORS → Clerk → authorized party guard → tenant guard
// 1. CORS — handles preflight before Clerk so OPTIONS requests are not rejected
app.use(
  '*',
  cors({
    origin: (origin) => resolveAllowedOrigin(origin),
    credentials: true,
  })
);

// 2. Clerk JWT verification — clockSkewInMs handles Railway container clock drift (D-04)
// azp validation uses authorizedPartyGuard + isAllowedParty so Railway PR preview
// origins and tenant subdomains can be allowlisted without a static string[].
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

// Unmatched routes — returns JSON shape consistent with onError handler
app.notFound((c) =>
  c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404)
);

// Centralized error handler (D-04) — registered AFTER routes, BEFORE serve()
// NotFoundError → 404 NOT_FOUND
// DomainError → statusCode DOMAIN_ERROR
// Generic Error → 500 INTERNAL_ERROR
app.onError((err, c) => {
  if (err instanceof NotFoundError) {
    return c.json({ error: { code: 'NOT_FOUND', message: err.message } }, 404);
  }
  if (err instanceof DomainError) {
    return c.json(
      { error: { code: err.code ?? 'DOMAIN_ERROR', message: err.message } },
      err.statusCode as ContentfulStatusCode
    );
  }
  console.error('[API] Unhandled error:', err);
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
    500
  );
});

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8080) });
