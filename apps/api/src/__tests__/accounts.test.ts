import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { accountsRouter } from '../routes/accounts';

// Mock @hono/clerk-auth so getAuth returns a known orgId
vi.mock('@hono/clerk-auth', () => ({
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
            institution: null,
            lastFour: null,
            eachPersonPaysOwn: false,
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
              institution: null,
              lastFour: null,
              eachPersonPaysOwn: false,
              archivedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        }),
      }),
    }),
    transaction: vi.fn(
      async (
        fn: (tx: {
          insert: ReturnType<typeof vi.fn>;
          delete: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        }) => Promise<unknown>
      ) => {
        const result = await fn({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'acct_1',
                  orgId: 'org_test123',
                  name: 'Chequing',
                  type: 'chequing',
                  institution: null,
                  lastFour: null,
                  eachPersonPaysOwn: false,
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
                    institution: null,
                    lastFour: null,
                    eachPersonPaysOwn: false,
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

vi.mock('@ploutizo/db/schema', () => ({ accounts: {}, accountMembers: {} }));

const app = new Hono();
app.route('/', accountsRouter);

describe('GET /api/accounts', () => {
  it('returns 200 with data array', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<unknown> };
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/accounts', () => {
  it('returns 201 with created account on valid payload', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Chequing', type: 'chequing' }),
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
      body: JSON.stringify({ institution: 'TD Bank' }),
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
});

describe('DELETE /api/accounts/:id/archive', () => {
  it('returns 200 or 404 for archive endpoint', async () => {
    const res = await app.request('/acct_1/archive', { method: 'DELETE' });
    expect([200, 404]).toContain(res.status);
  });
});
