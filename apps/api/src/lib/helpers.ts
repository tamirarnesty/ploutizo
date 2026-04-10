import type { Context } from 'hono';

// Per D-09: reusable 400 helper for all routes
export const badRequest = (c: Context, message: string) =>
  c.json({ error: { code: 'BAD_REQUEST', message } }, 400);
