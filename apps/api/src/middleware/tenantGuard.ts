import { createMiddleware } from 'hono/factory';
import { getAuth } from '@hono/clerk-auth';
import { db } from '@ploutizo/db';
import { orgs } from '@ploutizo/db/schema';
import type { AppEnv } from '../types';

// tenantGuard: rejects requests with no active Clerk org.
// CRITICAL: checks !orgId (falsy) — Clerk returns undefined (not null) when no active org.
// Applied to /api/* only — never to /health or /webhooks.
//
// Upsert guard: ensures the orgs row exists in the local DB before any handler runs.
// The authoritative creation path is the organization.created Clerk webhook; this upsert
// is a safety net for cases where that webhook failed to deliver (e.g., misconfigured
// secret, network failure, or org created before the app was deployed).
// seenOrgs caches org IDs that have been upserted this process lifetime — avoids a DB
// round-trip on every request after the first. Resets on cold start (safe: DB row persists).
const seenOrgs = new Set<string>();

export const tenantGuard = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const { orgId } = getAuth(c);
    if (!orgId) {
      return c.json(
        {
          error: {
            code: 'TENANT_REQUIRED',
            message: 'No active organisation.',
          },
        },
        401
      );
    }
    if (!seenOrgs.has(orgId)) {
      await db.insert(orgs).values({ id: orgId }).onConflictDoNothing();
      seenOrgs.add(orgId);
    }
    c.set('orgId', orgId);
    await next();
  });
