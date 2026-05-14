import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { getAuth } from '@clerk/hono';
import { tenantGuard } from '../middleware/tenantGuard';
import { ensureCallerSyncedToOrg } from '../services/clerkMembershipSync';

// Mock @clerk/hono to control what getAuth() returns per test
vi.mock('@clerk/hono', () => ({
  getAuth: vi.fn(),
  clerkMiddleware: vi.fn(
    () => async (_c: unknown, next: () => Promise<void>) => next()
  ),
}));

// vi.hoisted ensures this variable is initialized before vi.mock factories run (hoisting order).
const { mockOnConflictDoNothing } = vi.hoisted(() => ({
  mockOnConflictDoNothing: vi.fn().mockResolvedValue(undefined),
}));

// Mock @ploutizo/db so the upsert guard doesn't make real DB calls.
// onConflictDoNothing() is the terminal call in the chain.
vi.mock('@ploutizo/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: mockOnConflictDoNothing,
      }),
    }),
  },
}));

vi.mock('@ploutizo/db/schema', () => ({ orgs: {} }));

vi.mock('@ploutizo/db/seeds', () => ({
  ensureOrgSeeded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/clerkMembershipSync', () => ({
  ensureCallerSyncedToOrg: vi.fn().mockResolvedValue(undefined),
}));

const buildApp = () => {
  const app = new Hono();
  app.use('*', tenantGuard());
  app.get('/', (c) => c.json({ data: { ok: true } }));
  return app;
};

describe('tenantGuard()', () => {
  it('returns 401 when orgId is undefined', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: undefined } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('TENANT_REQUIRED');
  });

  it('returns 401 when orgId is null', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: null } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('TENANT_REQUIRED');
  });

  it('returns 401 when orgId is empty string', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: '' } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
  });

  it('calls next() and returns 200 when orgId is a valid string', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: 'org_abc123' } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ok: boolean } };
    expect(body.data.ok).toBe(true);
  });

  it('upserts the org row before calling next() when orgId is valid', async () => {
    mockOnConflictDoNothing.mockClear();
    // Use a unique orgId not seen by prior tests to bypass the seenOrgBootstrap cache
    vi.mocked(getAuth).mockReturnValue({ orgId: 'org_upsert_test' } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(200);
    expect(mockOnConflictDoNothing).toHaveBeenCalledOnce();
  });

  it('does not upsert when orgId is missing (401 returned early)', async () => {
    mockOnConflictDoNothing.mockClear();
    vi.mocked(getAuth).mockReturnValue({ orgId: undefined } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
    expect(mockOnConflictDoNothing).not.toHaveBeenCalled();
  });

  it('error body has correct shape', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: undefined } as never);
    const res = await buildApp().request('/');
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('error.code');
    expect(body).toHaveProperty('error.message');
    expect(body).not.toHaveProperty('data');
  });

  it('sets orgId on context via c.set before calling next()', async () => {
    vi.mocked(getAuth).mockReturnValue({
      orgId: 'org_context_test',
    } as never);
    // Build a special app that reads c.get('orgId') from a downstream handler
    const app = new Hono();
    app.use('*', tenantGuard());
    app.get('/', (c) => {
      const orgId = c.get('orgId' as never) as string | undefined;
      return c.json({ orgId });
    });
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { orgId: string };
    expect(body.orgId).toBe('org_context_test');
  });

  it('runs ensureCallerSyncedToOrg for each distinct user in the same org', async () => {
    vi.mocked(ensureCallerSyncedToOrg).mockClear();
    mockOnConflictDoNothing.mockClear();
    const orgId = 'org_multi_member_sync';
    const app = buildApp();

    vi.mocked(getAuth).mockReturnValue({
      orgId,
      userId: 'user_clerk_a',
    } as never);
    await app.request('/');
    vi.mocked(getAuth).mockReturnValue({
      orgId,
      userId: 'user_clerk_b',
    } as never);
    await app.request('/');

    expect(ensureCallerSyncedToOrg).toHaveBeenCalledTimes(2);
    expect(ensureCallerSyncedToOrg).toHaveBeenNthCalledWith(1, orgId, 'user_clerk_a');
    expect(ensureCallerSyncedToOrg).toHaveBeenNthCalledWith(2, orgId, 'user_clerk_b');
    expect(mockOnConflictDoNothing).toHaveBeenCalledOnce();
  });

  it('does not re-run ensureCallerSyncedToOrg for the same org+user pair', async () => {
    vi.mocked(ensureCallerSyncedToOrg).mockClear();
    const orgId = 'org_same_user_twice';
    const app = buildApp();
    vi.mocked(getAuth).mockReturnValue({
      orgId,
      userId: 'user_clerk_x',
    } as never);
    await app.request('/');
    await app.request('/');
    expect(ensureCallerSyncedToOrg).toHaveBeenCalledOnce();
  });

  it('retries ensureCallerSyncedToOrg on a later request after a transient failure', async () => {
    vi.mocked(ensureCallerSyncedToOrg).mockClear();
    vi.mocked(ensureCallerSyncedToOrg)
      .mockRejectedValueOnce(new Error('clerk unavailable'))
      .mockResolvedValueOnce(undefined);
    const orgId = 'org_sync_retry';
    const app = buildApp();
    vi.mocked(getAuth).mockReturnValue({
      orgId,
      userId: 'user_retry',
    } as never);
    expect((await app.request('/')).status).toBe(200);
    expect((await app.request('/')).status).toBe(200);
    expect(ensureCallerSyncedToOrg).toHaveBeenCalledTimes(2);
  });
});
