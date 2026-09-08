import { db } from '@ploutizo/db';
import { orgs } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';
import { seedOrg } from '@ploutizo/db/seeds';
import {
  deleteOrgMemberIfPresent,
  findLocalUserIdByClerkId,
  insertLocalUserIfAbsent,
  insertOrgMemberIfAbsent,
  updateLocalUserFromUserJson,
  updateOrgMemberFromMembershipJson,
  userJsonToLocalUserRow,
} from './clerkDbMirror';
import type {
  OrganizationJSON,
  OrganizationMembershipJSON,
  UserJSON,
  WebhookEvent,
} from '@clerk/backend';

export { HANDLED_CLERK_WEBHOOK_EVENTS } from './clerkWebhookEvents';

// One handler per Clerk event type — per D-07, D-08.
// Clerk v3 uses Webhook<type, Data> generics so Extract<WebhookEvent, {type}> resolves to never.
// Import JSON types directly instead of extracting from the discriminated union.
//
// Clerk dashboard webhook endpoint must subscribe to every event in
// {@link HANDLED_CLERK_WEBHOOK_EVENTS}. Intentionally unhandled: user.deleted,
// organization.deleted (cascade elsewhere), invitations, sessions, billing.

export const handleOrgCreated = async (data: OrganizationJSON) => {
  await db
    .insert(orgs)
    .values({ id: data.id, name: data.name, imageUrl: data.image_url ?? null })
    .onConflictDoUpdate({
      target: orgs.id,
      set: {
        name: data.name,
        imageUrl: data.image_url ?? null,
        updatedAt: new Date(),
      },
    });
  await seedOrg(data.id);
};

export const handleOrgUpdated = async (data: OrganizationJSON) => {
  await db
    .update(orgs)
    .set({
      name: data.name,
      imageUrl: data.image_url ?? null,
      updatedAt: new Date(),
    })
    .where(eq(orgs.id, data.id));
};

export const handleUserCreated = async (data: UserJSON) => {
  const row = userJsonToLocalUserRow(data);
  if (!row) return;
  await insertLocalUserIfAbsent(row);
};

export const handleUserUpdated = async (data: UserJSON) => {
  await updateLocalUserFromUserJson(data);
};

export const handleOrgMembershipUpdated = async (
  data: OrganizationMembershipJSON
) => {
  await updateOrgMemberFromMembershipJson(data);
};

export const handleOrgMembershipCreated = async (
  data: OrganizationMembershipJSON
) => {
  const appUserId = await findLocalUserIdByClerkId(
    data.public_user_data.user_id
  );
  if (!appUserId) return;

  await insertOrgMemberIfAbsent({
    orgId: data.organization.id,
    appUserId,
    clerkMembershipId: data.id,
    membershipCreatedAt: new Date(data.created_at),
    clerkOrgRole: data.role,
  });
};

export const handleOrgMembershipDeleted = async (
  data: OrganizationMembershipJSON
) => {
  await deleteOrgMemberIfPresent({
    orgId: data.organization.id,
    clerkUserId: data.public_user_data.user_id,
    clerkMembershipId: data.id,
  });
};

// Dispatch event to the appropriate handler based on event.type narrowing (D-08).
// Casts needed because Clerk v3 Webhook<type, Data> generics cause event.data to not
// narrow to the concrete JSON types after Extract<WebhookEvent, {type}>.
export const dispatchWebhookEvent = async (event: WebhookEvent) => {
  switch (event.type) {
    case 'organization.created':
      return handleOrgCreated(event.data);
    case 'organization.updated':
      return handleOrgUpdated(event.data);
    case 'user.created':
      return handleUserCreated(event.data);
    case 'user.updated':
      return handleUserUpdated(event.data);
    case 'organizationMembership.created':
      return handleOrgMembershipCreated(event.data);
    case 'organizationMembership.updated':
      return handleOrgMembershipUpdated(event.data);
    case 'organizationMembership.deleted':
      return handleOrgMembershipDeleted(event.data);
    default: {
      const unhandled = event as { type?: string };
      console.warn(
        '[webhooks] skipping unhandled Clerk webhook event type:',
        unhandled.type ?? '(missing type)'
      );
      return;
    }
  }
};
