import { createMiddleware } from 'hono/factory';
import { getAuth } from '@clerk/hono';
import { db } from '@ploutizo/db';
import { ensureOrgSeeded } from '@ploutizo/db/seeds';
import { orgs } from '@ploutizo/db/schema';
import { ensureCallerSyncedToOrg } from '../services/clerkMembershipSync';
import { redactIdentifier } from '../lib/redact';
import type { AppEnv } from '../types';

// tenantGuard: rejects requests with no active Clerk org.
// CRITICAL: checks !orgId (falsy) — Clerk returns undefined (not null) when no active org.
// Applied to /api/* only — never to /health or /webhooks.
//
// Upsert guard: ensures the orgs row exists in the local DB before any handler runs.
// The authoritative creation path is the organization.created Clerk webhook; this upsert
// is a safety net for cases where that webhook failed to deliver (e.g., misconfigured
// secret, network failure, or org created before the app was deployed).
// ensureOrgSeeded() and ensureCallerSyncedToOrg are idempotent; they check existence
// before inserting. Called on every request — DB round-trip cost acceptable given
// connection pooling and query performance; eliminates unbounded process-level state.

export const tenantGuard = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const { orgId, userId } = getAuth(c);
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
    await db.insert(orgs).values({ id: orgId }).onConflictDoNothing();
    await ensureOrgSeeded(orgId);
    if (userId) {
      try {
        await ensureCallerSyncedToOrg(orgId, userId);
      } catch (err) {
        // Clerk outage or misconfiguration — do not block the request; downstream
        // routes may still fail if org_members is required.
        // TODO(phase logging): replace with structured logger.
        console.error('[tenantGuard] ensureCallerSyncedToOrg failed', {
          orgId: redactIdentifier(orgId),
          userId: redactIdentifier(userId),
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    c.set('orgId', orgId);
    await next();
  });
