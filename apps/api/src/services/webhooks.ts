import { db } from '@ploutizo/db';
import { orgMembers, orgs, users } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';
import { seedOrg } from '@ploutizo/db/seeds';
import type { WebhookEvent } from '@clerk/backend';

// One handler per Clerk event type — per D-07, D-08.
// WebhookEvent discriminated union provides typed event.data after narrowing on event.type.

export async function handleOrgCreated(
  data: Extract<WebhookEvent, { type: 'organization.created' }>['data']
) {
  await db
    .insert(orgs)
    .values({ id: data.id, name: data.name, imageUrl: data.image_url ?? null })
    .onConflictDoNothing();
  await seedOrg(data.id);
}

export async function handleOrgUpdated(
  data: Extract<WebhookEvent, { type: 'organization.updated' }>['data']
) {
  await db
    .update(orgs)
    .set({ name: data.name, imageUrl: data.image_url ?? null, updatedAt: new Date() })
    .where(eq(orgs.id, data.id));
}

export async function handleUserCreated(
  data: Extract<WebhookEvent, { type: 'user.created' }>['data']
) {
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;
  if (!primaryEmail) return;
  const fullName =
    [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
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

export async function handleUserUpdated(
  data: Extract<WebhookEvent, { type: 'user.updated' }>['data']
) {
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;
  const fullName =
    [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  if (!primaryEmail) return;
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

export async function handleOrgMembershipCreated(
  data: Extract<WebhookEvent, { type: 'organizationMembership.created' }>['data']
) {
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.externalId, data.public_user_data.user_id))
    .then((rows) => rows.at(0));

  if (!user) return;

  const displayName =
    [data.public_user_data.first_name, data.public_user_data.last_name]
      .filter(Boolean)
      .join(' ') || data.public_user_data.user_id;

  await db
    .insert(orgMembers)
    .values({
      orgId: data.organization.id,
      userId: user.id,
      role: data.role === 'org:admin' ? 'admin' : 'admin',
      displayName,
    })
    .onConflictDoNothing();
}

// Dispatch event to the appropriate handler based on event.type narrowing (D-08).
export async function dispatchWebhookEvent(event: WebhookEvent) {
  if (event.type === 'organization.created') return handleOrgCreated(event.data);
  if (event.type === 'organization.updated') return handleOrgUpdated(event.data);
  if (event.type === 'user.created') return handleUserCreated(event.data);
  if (event.type === 'user.updated') return handleUserUpdated(event.data);
  if (event.type === 'organizationMembership.created')
    return handleOrgMembershipCreated(event.data);
  // Unknown event types are silently ignored
}
