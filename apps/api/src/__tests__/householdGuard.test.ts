import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { getAuth } from '@clerk/hono';
import { householdGuard } from '../middleware/householdGuard';
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
  app.use('*', householdGuard());
  app.get('/', (c) => c.json({ data: { ok: true } }));
  return app;
};

describe('householdGuard()', () => {
  it('rejects a missing signed-in member before returning household data', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: undefined,
      orgId: 'org_abc123',
    } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('SIGNED_IN_MEMBER_REQUIRED');
  });

  it('rejects a missing active household before returning household data', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_abc123',
      orgId: undefined,
    } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ACTIVE_HOUSEHOLD_REQUIRED');
  });

  it('returns 401 when the active household id is null', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_abc123',
      orgId: null,
    } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ACTIVE_HOUSEHOLD_REQUIRED');
  });

  it('returns 401 when the active household id is empty', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_abc123',
      orgId: '',
    } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
  });

  it('calls next() and returns 200 when signed-in member and active household are present', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_abc123',
      orgId: 'org_abc123',
    } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ok: boolean } };
    expect(body.data.ok).toBe(true);
  });

  it('marks household API responses private and uncacheable', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_cache',
      orgId: 'org_cache',
    } as never);
    const res = await buildApp().request('/');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('upserts the org row before calling next() when orgId is valid', async () => {
    mockOnConflictDoNothing.mockClear();
    // Use a unique orgId not seen by prior tests to bypass the seenOrgBootstrap cache
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_upsert_test',
      orgId: 'org_upsert_test',
    } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(200);
    expect(mockOnConflictDoNothing).toHaveBeenCalledOnce();
  });

  it('does not upsert when signed-in member is missing', async () => {
    mockOnConflictDoNothing.mockClear();
    vi.mocked(getAuth).mockReturnValue({
      userId: undefined,
      orgId: 'org_abc123',
    } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
    expect(mockOnConflictDoNothing).not.toHaveBeenCalled();
  });

  it('does not upsert when active household is missing', async () => {
    mockOnConflictDoNothing.mockClear();
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_abc123',
      orgId: undefined,
    } as never);
    const res = await buildApp().request('/');
    expect(res.status).toBe(401);
    expect(mockOnConflictDoNothing).not.toHaveBeenCalled();
  });

  it('error body has correct shape', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_abc123',
      orgId: undefined,
    } as never);
    const res = await buildApp().request('/');
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('error.code');
    expect(body).toHaveProperty('error.message');
    expect(body).not.toHaveProperty('data');
  });

  it('sets the household principal on context before calling next()', async () => {
    vi.mocked(getAuth).mockReturnValue({
      userId: 'user_context_test',
      orgId: 'org_context_test',
    } as never);
    const app = new Hono();
    app.use('*', householdGuard());
    app.get('/', (c) => {
      const principal = c.get('principal' as never) as
        | {
            signedInMemberId: string;
            activeHouseholdId: string;
          }
        | undefined;
      return c.json({ principal });
    });
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      principal: { signedInMemberId: string; activeHouseholdId: string };
    };
    expect(body.principal).toEqual({
      signedInMemberId: 'user_context_test',
      activeHouseholdId: 'org_context_test',
    });
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
    expect(ensureCallerSyncedToOrg).toHaveBeenNthCalledWith(
      1,
      orgId,
      'user_clerk_a'
    );
    expect(ensureCallerSyncedToOrg).toHaveBeenNthCalledWith(
      2,
      orgId,
      'user_clerk_b'
    );
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
