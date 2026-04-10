import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { categoriesRouter } from '../routes/categories';

vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123' })),
}));
vi.mock('@ploutizo/db', () => ({
  db: {
    select: vi
      .fn()
      .mockReturnValue({
        from: vi
          .fn()
          .mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }),
          }),
      }),
    insert: vi
      .fn()
      .mockReturnValue({
        values: vi
          .fn()
          .mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([
                {
                  id: 'cat_1',
                  orgId: 'org_test123',
                  name: 'Food',
                  icon: 'UtensilsCrossed',
                  colour: 'green-500',
                  sortOrder: 0,
                  archivedAt: null,
                  createdAt: new Date().toISOString(),
                },
              ]),
          }),
      }),
    update: vi
      .fn()
      .mockReturnValue({
        set: vi
          .fn()
          .mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({
                returning: vi
                  .fn()
                  .mockResolvedValue([
                    {
                      id: 'cat_1',
                      orgId: 'org_test123',
                      name: 'Food Updated',
                      icon: null,
                      colour: null,
                      sortOrder: 0,
                      archivedAt: null,
                      createdAt: new Date().toISOString(),
                    },
                  ]),
              }),
          }),
      }),
    transaction: vi.fn((fn) =>
      fn({
        update: vi
          .fn()
          .mockReturnValue({
            set: vi
              .fn()
              .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
          }),
      })
    ),
  },
}));
vi.mock('@ploutizo/db/schema', () => ({ categories: {} }));

const app = new Hono();
app.route('/', categoriesRouter);

describe('GET /api/categories', () => {
  it('returns 200 with data array', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<unknown> };
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/categories', () => {
  it('returns 201 with created category', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Food',
        icon: 'UtensilsCrossed',
        colour: 'green-500',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data).toHaveProperty('id');
  });
  it('returns 400 on missing name', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icon: 'ShoppingCart' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/categories/reorder', () => {
  it('returns 200 with ok true', async () => {
    const res = await app.request('/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderedIds: [
          '550e8400-e29b-41d4-a716-446655440000',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        ],
      }),
    });
    expect(res.status).toBe(200);
  });
});
