import { Hono } from 'hono';
import { Webhook } from 'svix';
import { seedOrg } from '@ploutizo/db/seeds';
import { db } from '@ploutizo/db';
import { orgMembers, orgs, users } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';

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

  let event: {
    type: string;
    data: Record<string, unknown>;
  };
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
    const data = event.data as { id: string; name: string; image_url: string | null };
    await db.insert(orgs).values({ id: data.id, name: data.name, imageUrl: data.image_url ?? null }).onConflictDoNothing();
    await seedOrg(data.id);
  }

  if (event.type === 'organization.updated') {
    const data = event.data as { id: string; name: string; image_url: string | null };
    await db
      .update(orgs)
      .set({ name: data.name, imageUrl: data.image_url ?? null, updatedAt: new Date() })
      .where(eq(orgs.id, data.id));
  }

  if (event.type === 'user.created') {
    const data = event.data as {
      id: string;
      email_addresses: Array<{ email_address: string; id: string }>;
      primary_email_address_id: string;
      first_name: string | null;
      last_name: string | null;
      image_url: string | null;
    };
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id
    )?.email_address;
    if (primaryEmail) {
      const fullName = [data.first_name, data.last_name]
        .filter(Boolean)
        .join(' ') || null;
      await db
        .insert(users)
        .values({
          externalId: data.id,
          email: primaryEmail,
          fullName,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
          imageUrl: data.image_url ?? null,
        })
        .onConflictDoNothing();
    }
  }

  if (event.type === 'user.updated') {
    const data = event.data as {
      id: string;
      email_addresses: Array<{ email_address: string; id: string }>;
      primary_email_address_id: string;
      first_name: string | null;
      last_name: string | null;
      image_url: string | null;
    };
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id
    )?.email_address;
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
    if (primaryEmail) {
      await db
        .update(users)
        .set({
          email: primaryEmail,
          fullName,
          firstName: data.first_name ?? null,
          lastName: data.last_name ?? null,
          imageUrl: data.image_url ?? null,
        })
        .where(eq(users.externalId, data.id));
    }
  }

  if (event.type === 'organizationMembership.created') {
    const data = event.data as {
      organization: { id: string };
      public_user_data: {
        user_id: string;
        first_name: string | null;
        last_name: string | null;
      };
      role: string;
    };
    const { organization, public_user_data, role } = data;

    // Look up the internal user row by Clerk user ID
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.externalId, public_user_data.user_id))
      .then((rows) => rows.at(0));

    if (user) {
      const displayName =
        [public_user_data.first_name, public_user_data.last_name]
          .filter(Boolean)
          .join(' ') || public_user_data.user_id;

      await db
        .insert(orgMembers)
        .values({
          orgId: organization.id,
          userId: user.id,
          role: role === 'org:admin' ? 'admin' : 'admin',
          displayName,
        })
        .onConflictDoNothing();
    }
  }

  return c.json({ data: { received: true } });
});

export { webhooksRouter };
