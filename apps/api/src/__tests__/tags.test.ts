import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { tagsRouter } from '../routes/tags';

vi.mock('@clerk/hono', () => ({
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
                  id: 'tag_1',
                  orgId: 'org_test123',
                  name: 'vacation',
                  colour: null,
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
              .mockReturnValue({ returning: vi.fn().mockResolvedValue([{}]) }),
          }),
      }),
  },
}));
vi.mock('@ploutizo/db/schema', () => ({ tags: {} }));

const app = new Hono();
app.route('/', tagsRouter);

describe('POST /api/tags', () => {
  it('returns 201 with created tag', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'vacation' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { name: string } };
    expect(body.data.name).toBe('vacation');
  });
  it('returns 400 on missing name', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
