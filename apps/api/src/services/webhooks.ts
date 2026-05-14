import { db } from '@ploutizo/db';
import { orgs, users } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';
import { seedOrg } from '@ploutizo/db/seeds';
import {
  buildOrgMemberDisplayName,
  insertLocalUserIfAbsent,
  insertOrgMemberIfAbsent,
  updateLocalUserFromUserJson,
  userJsonToLocalUserRow,
} from './clerkDbMirror';
import type {
  OrganizationJSON,
  OrganizationMembershipJSON,
  UserJSON,
  WebhookEvent,
} from '@clerk/backend';

// One handler per Clerk event type — per D-07, D-08.
// Clerk v3 uses Webhook<type, Data> generics so Extract<WebhookEvent, {type}> resolves to never.
// Import JSON types directly instead of extracting from the discriminated union.

export const handleOrgCreated = async (data: OrganizationJSON) => {
  await db
    .insert(orgs)
    .values({ id: data.id, name: data.name, imageUrl: data.image_url ?? null })
    .onConflictDoNothing();
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

export const handleOrgMembershipCreated = async (
  data: OrganizationMembershipJSON
) => {
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.externalId, data.public_user_data.user_id))
    .then((rows) => rows.at(0));

  if (!user) return;

  const displayName = buildOrgMemberDisplayName({
    firstName: data.public_user_data.first_name,
    lastName: data.public_user_data.last_name,
    fallbackUserId: data.public_user_data.user_id,
  });

  await insertOrgMemberIfAbsent({
    orgId: data.organization.id,
    appUserId: user.id,
    displayName,
  });
};

// Dispatch event to the appropriate handler based on event.type narrowing (D-08).
// Casts needed because Clerk v3 Webhook<type, Data> generics cause event.data to not
// narrow to the concrete JSON types after Extract<WebhookEvent, {type}>.
export const dispatchWebhookEvent = async (event: WebhookEvent) => {
  if (event.type === 'organization.created') return handleOrgCreated(event.data);
  if (event.type === 'organization.updated') return handleOrgUpdated(event.data);
  if (event.type === 'user.created') return handleUserCreated(event.data);
  if (event.type === 'user.updated') return handleUserUpdated(event.data);
  if (event.type === 'organizationMembership.created')
    return handleOrgMembershipCreated(event.data);
  // Unknown event types are silently ignored
};
