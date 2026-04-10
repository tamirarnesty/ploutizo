import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { healthRouter } from '../routes/health';

describe('GET /health', () => {
  const app = new Hono();
  app.route('/', healthRouter);

  it('returns 200 with status ok', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { status: 'ok' } });
  });

  it('returns JSON content type', async () => {
    const res = await app.request('/');
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
