import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { resolveNormalizedRoute, scrubPathToTemplate } from './routeTemplate';

describe('scrubPathToTemplate', () => {
  it('replaces uuid, numeric, and clerk-style id segments', () => {
    expect(
      scrubPathToTemplate(
        '/api/accounts/org_abc123/items/550e8400-e29b-41d4-a716-446655440000/42'
      )
    ).toBe('/api/accounts/:id/items/:id/:id');
  });
});

describe('resolveNormalizedRoute', () => {
  it('returns the matched route template after the handler runs', async () => {
    const app = new Hono();
    let captured = '';

    app.use('*', async (c, next) => {
      await next();
      captured = resolveNormalizedRoute(c);
    });
    app.get('/api/accounts/:id', (c) => c.json({ ok: true }));

    const res = await app.request('/api/accounts/acc_123');
    expect(res.status).toBe(200);
    expect(captured).toContain('/api/accounts');
    expect(captured).toContain(':id');
    expect(captured).not.toContain('acc_123');
  });
});
