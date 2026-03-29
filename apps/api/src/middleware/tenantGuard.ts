import { createMiddleware } from 'hono/factory'
import { getAuth } from '@hono/clerk-auth'

// tenantGuard: rejects requests with no active Clerk org.
// CRITICAL: checks !orgId (falsy) — Clerk returns undefined (not null) when no active org.
// Applied to /api/* only — never to /health or /webhooks.
export const tenantGuard = () =>
  createMiddleware(async (c, next) => {
    const { orgId } = getAuth(c)
    if (!orgId) {
      return c.json(
        { error: { code: 'TENANT_REQUIRED', message: 'No active organisation.' } },
        401
      )
    }
    await next()
  })
