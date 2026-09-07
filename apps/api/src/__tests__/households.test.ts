import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClerkOrgAdminError } from '../lib/clerkOrgAdmin';
import { householdsRouter } from '../routes/households';
import { createRouteTestApp } from './testUtils';
import type { AppEnv } from '../types';

const { mockClerkOrgAdmin } = vi.hoisted(() => ({
  mockClerkOrgAdmin: {
    createInvitation: vi.fn(),
    listInvitations: vi.fn(),
    revokeInvitation: vi.fn(),
    deleteMembership: vi.fn(),
  },
}));

vi.mock('@clerk/hono', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123', userId: 'user_clerk_abc' })),
}));

vi.mock('../lib/clerkOrgAdmin', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected ../lib/clerkOrgAdmin module shape.');
  }
  return {
    ...actual,
    clerkOrgAdmin: mockClerkOrgAdmin,
  };
});

// Default DB mock — covers settings, update, and members queries
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@ploutizo/db', () => ({
  db: {
    get select() {
      return mockSelect;
    },
    get update() {
      return mockUpdate;
    },
    get delete() {
      return mockDelete;
    },
  },
}));

vi.mock('@ploutizo/db/schema', () => ({
  orgs: {},
  orgMembers: {},
  users: {},
}));

const app = createRouteTestApp<AppEnv>((testApp) => {
  testApp.use('/*', async (c, next) => {
    c.set('orgId', 'org_test123');
    await next();
  });
  testApp.route('/', householdsRouter);
});

beforeEach(() => {
  vi.resetAllMocks();
  // Default: select chain returns settlementThreshold for /settings
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => ({
        then: (fn: (rows: unknown[]) => unknown) =>
          Promise.resolve(fn([{ settlementThreshold: 5000 }])),
        orderBy: vi.fn().mockResolvedValue([]),
      })),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
          then: (fn: (rows: unknown[]) => unknown) => Promise.resolve(fn([])),
        }),
      }),
    }),
  });
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ settlementThreshold: 10000 }]),
      }),
    }),
  });
  mockDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  });
});

describe('GET /api/households/settings', () => {
  it('returns 200 with settlementThreshold', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: (fn: (rows: unknown[]) => unknown) =>
            Promise.resolve(fn([{ settlementThreshold: 5000 }])),
        }),
      }),
    });
    const res = await app.request('/settings');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { settlementThreshold: number | null };
    };
    expect(body.data).toHaveProperty('settlementThreshold');
  });
});

describe('PATCH /api/households/settings', () => {
  it('returns 200 with updated threshold', async () => {
    const res = await app.request('/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementThreshold: 10000 }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 400 on negative threshold', async () => {
    const res = await app.request('/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementThreshold: -100 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/households/members', () => {
  it('returns 200 with members including imageUrl, firstName, lastName', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'mem_1',
                orgId: 'org_test123',
                displayName: 'Alice',
                role: 'admin',
                joinedAt: new Date().toISOString(),
                externalId: 'user_ext_1',
                imageUrl: 'https://example.com/alice.jpg',
                firstName: 'Alice',
                lastName: 'Smith',
              },
            ]),
          }),
        }),
      }),
    });
    const res = await app.request('/members');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toHaveProperty('imageUrl');
    expect(body.data[0]).toHaveProperty('firstName');
    expect(body.data[0]).toHaveProperty('lastName');
  });
});

describe('GET /api/households (overview)', () => {
  it('returns 200 with name and imageUrl', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: (fn: (rows: unknown[]) => unknown) =>
            Promise.resolve(
              fn([
                {
                  name: 'Smith Family',
                  imageUrl: 'https://example.com/img.png',
                },
              ])
            ),
        }),
      }),
    });
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { name: string | null; imageUrl: string | null };
    };
    expect(body.data.name).toBe('Smith Family');
    expect(body.data.imageUrl).toBe('https://example.com/img.png');
  });

  it('returns null fields when org not found', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: (fn: (rows: unknown[]) => unknown) => Promise.resolve(fn([])),
        }),
      }),
    });
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { name: string | null; imageUrl: string | null };
    };
    expect(body.data.name).toBeNull();
    expect(body.data.imageUrl).toBeNull();
  });
});

describe('POST /api/households/invitations', () => {
  beforeEach(() => {
    mockClerkOrgAdmin.createInvitation.mockReset();
    mockClerkOrgAdmin.createInvitation.mockResolvedValue(undefined);
  });

  it('returns 200 with { data: { sent: true } } on success', async () => {
    const res = await app.request('/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { sent: boolean } };
    expect(body.data.sent).toBe(true);
    expect(mockClerkOrgAdmin.createInvitation).toHaveBeenCalledWith({
      organizationId: 'org_test123',
      emailAddress: 'new@example.com',
    });
  });

  it('returns 409 ALREADY_MEMBER when Clerk returns already_a_member_of_this_org', async () => {
    mockClerkOrgAdmin.createInvitation.mockRejectedValue(
      new ClerkOrgAdminError('already_member')
    );
    const res = await app.request('/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@example.com' }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ALREADY_MEMBER');
  });

  it('returns 409 INVITATION_PENDING when Clerk returns invitation_already_pending', async () => {
    mockClerkOrgAdmin.createInvitation.mockRejectedValue(
      new ClerkOrgAdminError('invitation_pending')
    );
    const res = await app.request('/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pending@example.com' }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVITATION_PENDING');
  });
});

describe('GET /api/households/invitations', () => {
  beforeEach(() => {
    mockClerkOrgAdmin.listInvitations.mockReset();
    mockClerkOrgAdmin.listInvitations.mockResolvedValue([]);
  });

  it('returns 200 with mapped camelCase invitations array', async () => {
    mockClerkOrgAdmin.listInvitations.mockResolvedValue([
      {
        id: 'inv_abc',
        email: 'user@example.com',
        status: 'pending',
        createdAt: new Date(1678886400000).toISOString(),
        expiresAt: new Date(1681564800000).toISOString(),
      },
    ]);
    const res = await app.request('/invitations');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    expect(body.data).toHaveLength(1);
    const row = body.data[0];
    expect(row).toHaveProperty('id', 'inv_abc');
    expect(row).toHaveProperty('email', 'user@example.com');
    expect(row).toHaveProperty('status', 'pending');
    // snake_case must NOT leak through to consumers
    expect(row).not.toHaveProperty('email_address');
    expect(row).not.toHaveProperty('created_at');
    expect(row).not.toHaveProperty('expires_at');
    // Timestamps are Unix ms — passed directly to new Date() (year 2023, not 1970)
    expect(row['createdAt']).toBe(new Date(1678886400000).toISOString());
    expect(row['expiresAt']).toBe(new Date(1681564800000).toISOString());
    expect(mockClerkOrgAdmin.listInvitations).toHaveBeenCalledWith(
      'org_test123'
    );
  });

  it('returns null expiresAt when Clerk omits expires_at', async () => {
    mockClerkOrgAdmin.listInvitations.mockResolvedValue([
      {
        id: 'inv_abc',
        email: 'user@example.com',
        status: 'pending',
        createdAt: new Date(1678886400000).toISOString(),
        expiresAt: null,
      },
    ]);
    const res = await app.request('/invitations');
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    expect(body.data[0]?.expiresAt).toBeNull();
  });

  it('returns 500 when Clerk responds non-OK', async () => {
    mockClerkOrgAdmin.listInvitations.mockRejectedValue(
      new ClerkOrgAdminError('unknown')
    );
    const res = await app.request('/invitations');
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/households/invitations/:invitationId', () => {
  beforeEach(() => {
    mockClerkOrgAdmin.revokeInvitation.mockReset();
    mockClerkOrgAdmin.revokeInvitation.mockResolvedValue(undefined);
  });

  it('returns 200 { data: { revoked: true } } on Clerk success', async () => {
    const res = await app.request('/invitations/inv_abc', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { revoked: boolean } };
    expect(body.data.revoked).toBe(true);
  });

  it('revokes through the org-admin port with requestingUserId', async () => {
    await app.request('/invitations/inv_abc', { method: 'DELETE' });
    expect(mockClerkOrgAdmin.revokeInvitation).toHaveBeenCalledWith({
      organizationId: 'org_test123',
      invitationId: 'inv_abc',
      requestingUserId: 'user_clerk_abc',
    });
  });

  it('treats Clerk 404 as success (idempotent revoke)', async () => {
    mockClerkOrgAdmin.revokeInvitation.mockResolvedValue(undefined);
    const res = await app.request('/invitations/inv_gone', {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
  });

  it('returns 500 when Clerk responds with non-404 error', async () => {
    mockClerkOrgAdmin.revokeInvitation.mockRejectedValue(
      new ClerkOrgAdminError('unknown')
    );
    const res = await app.request('/invitations/inv_abc', { method: 'DELETE' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/households/members/:memberId', () => {
  beforeEach(() => {
    mockClerkOrgAdmin.deleteMembership.mockReset();
    mockClerkOrgAdmin.deleteMembership.mockResolvedValue(undefined);
  });

  it('returns 200 { data: { removed: true } } for valid non-self member', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            then: (fn: (rows: unknown[]) => unknown) =>
              Promise.resolve(fn([{ externalId: 'user_clerk_other' }])),
          }),
        }),
      }),
    });
    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    const res = await app.request('/members/mem_abc123', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { removed: boolean } };
    expect(body.data.removed).toBe(true);
    expect(mockClerkOrgAdmin.deleteMembership).toHaveBeenCalledWith({
      organizationId: 'org_test123',
      clerkUserId: 'user_clerk_other',
    });
  });

  it('returns 403 SELF_REMOVAL_FORBIDDEN when caller tries to remove themselves', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            then: (fn: (rows: unknown[]) => unknown) =>
              Promise.resolve(fn([{ externalId: 'user_clerk_abc' }])),
          }),
        }),
      }),
    });
    const res = await app.request('/members/mem_self', { method: 'DELETE' });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('SELF_REMOVAL_FORBIDDEN');
    expect(mockClerkOrgAdmin.deleteMembership).not.toHaveBeenCalled();
  });

  it('returns 404 when memberId not found in org', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            then: (fn: (rows: unknown[]) => unknown) => Promise.resolve(fn([])),
          }),
        }),
      }),
    });
    const res = await app.request('/members/mem_nonexistent', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});
