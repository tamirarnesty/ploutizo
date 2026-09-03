import { describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import { createRouteTestApp } from './testUtils';
import type { Mock } from 'vitest';
import type { MockDbTransactionClient } from './testUtils';
import { accountsRouter } from '@/routes/accounts';

/** `db.select` after `vi.mock('@ploutizo/db')` — use for `mockReturnValueOnce` chains. */
type MockedAccountsDbSelect = Mock;

// Mock @clerk/hono so getAuth returns a known orgId
vi.mock('@clerk/hono', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123' })),
}));

// Mock @ploutizo/db so no real DB calls happen
vi.mock('@ploutizo/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'acct_1',
            orgId: 'org_test123',
            name: 'Chequing',
            type: 'chequing',
            institutionId: null,
            lastFour: null,
            archivedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'acct_1',
              orgId: 'org_test123',
              name: 'Chequing Updated',
              type: 'chequing',
              institutionId: null,
              lastFour: null,
              archivedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        }),
      }),
    }),
    transaction: vi.fn(
      async (fn: (tx: MockDbTransactionClient) => Promise<unknown>) => {
        const result = await fn({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'acct_1',
                  orgId: 'org_test123',
                  name: 'Chequing',
                  type: 'chequing',
                  institutionId: null,
                  lastFour: null,
                  archivedAt: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ]),
            }),
          }),
          delete: vi
            .fn()
            .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'acct_1',
                    orgId: 'org_test123',
                    name: 'Chequing Updated',
                    type: 'chequing',
                    institutionId: null,
                    lastFour: null,
                    archivedAt: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ]),
              }),
            }),
          }),
        });
        return result;
      }
    ),
  },
}));

vi.mock('@/lib/queries/scope', () => ({
  allMembersInOrg: vi.fn().mockResolvedValue(true),
}));

vi.mock('@ploutizo/db/schema', () => ({
  accounts: {},
  accountMembers: {},
  orgMembers: {},
  users: {},
}));

const app = createRouteTestApp((testApp) => {
  testApp.route('/', accountsRouter);
});

const OWNER_ID = '123e4567-e89b-12d3-a456-426614174000';

describe('GET /api/accounts', () => {
  it('returns 200 with data array', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns 200 with owners populated on shared account', async () => {
    // Call 1: listAccountsQuery — returns one account row
    (vi.mocked(db.select) as MockedAccountsDbSelect)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'acct_1',
                orgId: 'org_test123',
                name: 'Chequing',
                type: 'chequing',
                institutionId: null,
                lastFour: null,
                statementDueDay: 15,
                archivedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]),
          }),
        }),
      })
      // Call 2: listAccountMemberDetails — returns member row for acct_1
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  {
                    accountId: 'acct_1',
                    memberId: 'mem_1',
                    displayName: 'Alice',
                    imageUrl: 'https://img.clerk.com/alice.jpg',
                  },
                ]),
              }),
            }),
          }),
        }),
      });

    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        statementDueDay: number | null;
        owners: { id: string; displayName: string; imageUrl: string | null }[];
      }[];
    };
    expect(body.data[0].statementDueDay).toBe(15);
    expect(body.data[0].owners).toEqual([
      {
        id: 'mem_1',
        displayName: 'Alice',
        imageUrl: 'https://img.clerk.com/alice.jpg',
      },
    ]);
  });

  it('returns owners as [] when account has no members', async () => {
    // Call 1: listAccountsQuery — returns personal account
    (vi.mocked(db.select) as MockedAccountsDbSelect)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'acct_2',
                orgId: 'org_test123',
                name: 'Personal',
                type: 'chequing',
                institutionId: null,
                lastFour: null,
                archivedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]),
          }),
        }),
      })
      // Call 2: listAccountMemberDetails — returns empty (no members)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

    const res = await app.request('/');
    const body = (await res.json()) as { data: { owners: unknown[] }[] };
    expect(body.data[0].owners).toEqual([]);
  });
});

describe('POST /api/accounts', () => {
  it('returns 201 with created account on valid payload', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chequing',
        type: 'chequing',
        institutionId: 'td',
        memberIds: [OWNER_ID],
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; orgId: string } };
    expect(body.data).toHaveProperty('id');
    expect(body.data.orgId).toBe('org_test123');
  });

  it('returns 400 on missing required fields', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionId: 'td' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid account type', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', type: 'bitcoin_wallet' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when a credit card is missing a Financial institution', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Visa', type: 'credit_card' }),
    });
    expect(res.status).toBe(400);
  });

  it('creates a cash account without a Financial institution', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Wallet',
        type: 'prepaid_cash',
        memberIds: [OWNER_ID],
      }),
    });
    expect(res.status).toBe(201);
  });

  it('returns 400 when memberIds is missing or empty', async () => {
    const missing = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chequing',
        type: 'chequing',
        institutionId: 'td',
      }),
    });
    expect(missing.status).toBe(400);

    const empty = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chequing',
        type: 'chequing',
        institutionId: 'td',
        memberIds: [],
      }),
    });
    expect(empty.status).toBe(400);
  });
});

describe('PATCH /api/accounts/:id', () => {
  const mockExistingAccount = (overrides: Record<string, unknown> = {}) => {
    (vi.mocked(db.select) as MockedAccountsDbSelect).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'acct_1',
              orgId: 'org_test123',
              name: 'Chequing',
              type: 'chequing',
              institutionId: null,
              lastFour: null,
              archivedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ...overrides,
            },
          ]),
        }),
      }),
    });
  };

  it('returns 400 when updating a required-type account that still lacks an institution', async () => {
    mockExistingAccount({ type: 'credit_card', institutionId: null });

    const res = await app.request('/acct_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed Visa' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when clearing the Financial institution on a credit card', async () => {
    mockExistingAccount({ type: 'credit_card', institutionId: 'td' });
    const res = await app.request('/acct_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'credit_card', institutionId: null }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when clearing the Financial institution without a cash account type', async () => {
    mockExistingAccount({ type: 'chequing', institutionId: 'td' });
    const res = await app.request('/acct_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionId: null }),
    });
    expect(res.status).toBe(400);
  });

  it('accepts a selected Financial institution on update', async () => {
    mockExistingAccount({ type: 'chequing', institutionId: null });
    const res = await app.request('/acct_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'chequing', institutionId: 'cibc' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 400 when memberIds is an empty list', async () => {
    mockExistingAccount({ type: 'chequing', institutionId: 'td' });
    const res = await app.request('/acct_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('accepts a credit-card statement due day', async () => {
    mockExistingAccount({
      type: 'credit_card',
      institutionId: 'td',
      statementDueDay: null,
    });
    const res = await app.request('/acct_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statementDueDay: 15 }),
    });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/accounts/:id/archive', () => {
  it('returns 200 or 404 for archive endpoint', async () => {
    const res = await app.request('/acct_1/archive', { method: 'DELETE' });
    expect([200, 404]).toContain(res.status);
  });
});
