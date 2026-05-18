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
// ensureOrgSeeded() backfills default categories and merchant rules when the webhook
// never ran (typical in local dev) — idempotent if data already exists.
// Bounded in-process skips for idempotent bootstrap/sync (FIFO eviction when full).
// Unbounded Sets were replaced to avoid unlimited memory when many distinct org/users
// hit this process over long uptimes; if a key is evicted, the next request re-runs
// idempotent inserts/API calls safely.
const MAX_TOUCHED_BOOTSTRAP_ORGS = 1024;
const MAX_TOUCHED_CALLER_SYNCS = 4096;

const touchedOrgBootstrap = new Map<string, true>();
const touchedCallerOrgSync = new Map<string, true>();

const rememberBounded = (
  cache: Map<string, true>,
  key: string,
  maxEntries: number
) => {
  if (cache.has(key)) return;
  cache.set(key, true);
  if (cache.size > maxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
};

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
    if (!touchedOrgBootstrap.has(orgId)) {
      await db.insert(orgs).values({ id: orgId }).onConflictDoNothing();
      await ensureOrgSeeded(orgId);
      rememberBounded(touchedOrgBootstrap, orgId, MAX_TOUCHED_BOOTSTRAP_ORGS);
    }
    if (userId) {
      const syncKey = `${orgId}:${userId}`;
      if (!touchedCallerOrgSync.has(syncKey)) {
        try {
          await ensureCallerSyncedToOrg(orgId, userId);
          rememberBounded(
            touchedCallerOrgSync,
            syncKey,
            MAX_TOUCHED_CALLER_SYNCS
          );
        } catch (err) {
          // Clerk outage or misconfiguration — do not block the request; downstream
          // routes may still fail if org_members is required. Omit syncKey so the next
          // request retries.
          // TODO(phase logging): replace with structured logger.
          console.error('[tenantGuard] ensureCallerSyncedToOrg failed', {
            orgId: redactIdentifier(orgId),
            userId: redactIdentifier(userId),
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    c.set('orgId', orgId);
    await next();
  });
