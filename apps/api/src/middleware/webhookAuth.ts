import { createMiddleware } from 'hono/factory';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/backend';

// webhookAuth: extracts Svix signature verification from the webhooks route handler.
// CRITICAL: reads raw payload via c.req.text() — JSON parsing would break HMAC verification.
// Sets c.get('webhookEvent') on context for downstream handlers.
// Per D-07.

export const webhookAuth = () =>
  createMiddleware<{ Variables: { webhookEvent: WebhookEvent } }>(async (c, next) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return c.json(
        { error: { code: 'CONFIG_ERROR', message: 'Missing webhook secret.' } },
        500
      );
    }
    const svix = new Webhook(webhookSecret);
    const payload = await c.req.text();
    const headers = {
      'svix-id': c.req.header('svix-id') ?? '',
      'svix-timestamp': c.req.header('svix-timestamp') ?? '',
      'svix-signature': c.req.header('svix-signature') ?? '',
    };
    let event: WebhookEvent;
    try {
      event = svix.verify(payload, headers) as WebhookEvent;
    } catch {
      return c.json(
        {
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Webhook signature verification failed.',
          },
        },
        400
      );
    }
    c.set('webhookEvent', event);
    await next();
  });
