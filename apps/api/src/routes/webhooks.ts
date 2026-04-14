import { Hono } from 'hono';
import { webhookAuth } from '../middleware/webhookAuth';
import { dispatchWebhookEvent } from '../services/webhooks';

// webhooksRouter is NOT tenant-guarded — no AppEnv needed
const webhooksRouter = new Hono();

// POST /webhooks/clerk — Svix signature verified by webhookAuth middleware (D-07)
// IMPORTANT: tenantGuard is NOT applied to this route (no JWT on webhook requests)
webhooksRouter.post('/clerk', webhookAuth(), async (c) => {
  const event = c.get('webhookEvent');
  await dispatchWebhookEvent(event);
  return c.json({ data: { received: true } });
});

export { webhooksRouter };
