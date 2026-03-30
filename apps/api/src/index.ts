import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { clerkMiddleware } from '@hono/clerk-auth'
import { tenantGuard } from './middleware/tenantGuard.js'
import { healthRouter } from './routes/health.js'
import { webhooksRouter } from './routes/webhooks.js'

const app = new Hono()

// Invariant middleware order (CLAUDE.md): CORS → Clerk → tenant guard
// 1. CORS — handles preflight before Clerk so OPTIONS requests are not rejected
app.use(
  '*',
  cors({
    origin: (origin) =>
      origin === 'https://ploutizo.app' ||
      origin.endsWith('.ploutizo.app') ||
      origin === 'http://localhost:3000'
        ? origin
        : 'https://ploutizo.app',
    credentials: true,
  })
)

// 2. Clerk JWT verification — clockSkewInMs handles Railway container clock drift (D-04)
// authorizedParties: @hono/clerk-auth accepts string[] only (function type not supported).
// Resolution (D-04): isAllowedParty validates azp values via regex for subdomain support.
// Known parties are enumerated explicitly — Clerk wildcard glob syntax is unsupported (RESEARCH.md LOW confidence).
export const isAllowedParty = (azp: string): boolean =>
  azp === 'https://ploutizo.app' ||
  /^https:\/\/[a-z0-9-]+\.ploutizo\.app$/.test(azp) ||
  azp === 'http://localhost:3000'

// Build authorized parties list from known static origins.
// Dynamic subdomain validation (isAllowedParty) is applied at the app layer in Phase 2+.
const authorizedParties: string[] = [
  'https://ploutizo.app',
  'http://localhost:3000',
]

app.use(
  '*',
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    clockSkewInMs: 10000,
    authorizedParties,
  })
)

// 3. Tenant guard — scoped to /api/* ONLY (not /health, not /webhooks)
app.use('/api/*', tenantGuard())

// Routes excluded from tenant guard
app.route('/health', healthRouter)
app.route('/webhooks', webhooksRouter)

// Protected API routes added in Phase 2+
// app.route('/api/accounts', accountsRouter)

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8080) })
