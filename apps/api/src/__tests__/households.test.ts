import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { householdsRouter } from '../routes/households';

vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123', userId: 'user_clerk_abc' })),
}));

// Default DB mock — covers settings, update, and members queries
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@ploutizo/db', () => ({
  db: {
    get select() { return mockSelect; },
    get update() { return mockUpdate; },
    get delete() { return mockDelete; },
  },
}));

vi.mock('@ploutizo/db/schema', () => ({
  orgs: {},
  orgMembers: {},
  users: {},
}));

const app = new Hono();
app.route('/', householdsRouter);

beforeEach(() => {
  vi.resetAllMocks();
  // Default: select chain returns settlementThreshold for /settings
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => ({
        then: (fn: (rows: unknown[]) => unknown) => Promise.resolve(fn([{ settlementThreshold: 5000 }])),
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
          then: (fn: (rows: unknown[]) => unknown) => Promise.resolve(fn([{ settlementThreshold: 5000 }])),
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
    const body = (await res.json()) as { data: Array<Record<string, unknown>> };
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
            Promise.resolve(fn([{ name: 'Smith Family', imageUrl: 'https://example.com/img.png' }])),
        }),
      }),
    });
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { name: string | null; imageUrl: string | null } };
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
    const body = (await res.json()) as { data: { name: string | null; imageUrl: string | null } };
    expect(body.data.name).toBeNull();
    expect(body.data.imageUrl).toBeNull();
  });
});

describe('POST /api/households/invitations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns 200 with { data: { sent: true } } on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );
    const res = await app.request('/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { sent: boolean } };
    expect(body.data.sent).toBe(true);
  });

  it('returns 409 ALREADY_MEMBER when Clerk returns already_a_member_of_this_org', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ code: 'already_a_member_of_this_org' }] }),
        { status: 422 }
      )
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
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ code: 'invitation_already_pending' }] }),
        { status: 422 }
      )
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

describe('DELETE /api/households/members/:memberId', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
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
    const res = await app.request('/members/mem_nonexistent', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
