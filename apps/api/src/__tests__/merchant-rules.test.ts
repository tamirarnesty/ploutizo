import { describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import { merchantRulesRouter } from '../routes/merchant-rules';
import { createRouteTestApp } from './testUtils';

vi.mock('@clerk/hono', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123' })),
}));
vi.mock('@ploutizo/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'rule_1',
            orgId: 'org_test123',
            pattern: 'AMAZON',
            matchType: 'contains',
            renameTo: 'Amazon',
            categoryId: null,
            assigneeId: null,
            priority: 0,
            createdAt: new Date().toISOString(),
          },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue({ returning: vi.fn().mockResolvedValue([{}]) }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'rule_1' }]),
      }),
    }),
    transaction: vi.fn((fn) =>
      fn({
        update: vi.fn().mockReturnValue({
          set: vi
            .fn()
            .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
      })
    ),
  },
}));
vi.mock('@ploutizo/db/schema', () => ({ merchantRules: {} }));

const app = createRouteTestApp((testApp) => {
  testApp.route('/', merchantRulesRouter);
});

describe('POST /api/merchant-rules', () => {
  it('returns 201 on valid contains rule', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern: 'AMAZON', matchType: 'contains' }),
    });
    expect(res.status).toBe(201);
  });
  it('returns 400 INVALID_REGEX on invalid regex pattern', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern: '[invalid(regex', matchType: 'regex' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_REGEX');
  });
  it('returns 201 on valid regex pattern', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern: '^AMAZON.*', matchType: 'regex' }),
    });
    expect(res.status).toBe(201);
  });
  it('returns 400 on missing pattern', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchType: 'exact' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/merchant-rules/reorder', () => {
  it('returns 200 on valid reorder', async () => {
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

describe('DELETE /api/merchant-rules/:id', () => {
  it('returns 204 when rule exists', async () => {
    const res = await app.request('/rule_1', { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('returns 404 when rule is missing', async () => {
    vi.mocked(db.delete).mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    } as never);

    const res = await app.request('/rule_missing', { method: 'DELETE' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
