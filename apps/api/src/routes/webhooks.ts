import { Hono } from 'hono';
import { Webhook } from 'svix';
import { seedOrg } from '@ploutizo/db/seeds';
import { db } from '@ploutizo/db';
import { orgs } from '@ploutizo/db/schema';

const webhooksRouter = new Hono();

// POST /webhooks/clerk — Clerk webhook events
// IMPORTANT: tenantGuard is NOT applied to this route (no JWT on webhook requests)
webhooksRouter.post('/clerk', async (c) => {
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

  let event: { type: string; data: { id: string } };
  try {
    event = svix.verify(payload, headers) as typeof event;
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

  if (event.type === 'organization.created') {
    await db.insert(orgs).values({ id: event.data.id }).onConflictDoNothing();
    await seedOrg(event.data.id);
  }

  return c.json({ data: { received: true } });
});

export { webhooksRouter };
