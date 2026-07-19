import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { authorizedPartyGuard } from './authorizedPartyGuard';

const mockGetAuth = vi.fn();

vi.mock('@clerk/hono', () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
}));

describe('authorizedPartyGuard', () => {
  it('allows authenticated requests with an allowed azp', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_1',
      sessionClaims: { azp: 'https://web-ploutizo-pr-105.up.railway.app' },
    });

    const app = new Hono();
    app.use('*', authorizedPartyGuard());
    app.get('/api/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/test');
    expect(res.status).toBe(200);
  });

  it('rejects authenticated requests with a disallowed azp', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_1',
      sessionClaims: { azp: 'https://evil.example.com' },
    });

    const app = new Hono();
    app.use('*', authorizedPartyGuard());
    app.get('/api/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/test');
    expect(res.status).toBe(401);
  });

  it('allows unauthenticated requests through', async () => {
    mockGetAuth.mockReturnValue({ userId: null, sessionClaims: null });

    const app = new Hono();
    app.use('*', authorizedPartyGuard());
    app.get('/api/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/test');
    expect(res.status).toBe(200);
  });
});
