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
    clerkOrgRole: data.role,
  });
};

// Session lifecycle handlers — reserved for future login/logout state sync.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleSessionCreated = async (_data: unknown) => {
  // TODO: track session creation for audit log or active session management
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleSessionEnded = async (_data: unknown) => {
  // TODO: track session end for audit log or active session management
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
    case 'session.created':
      return handleSessionCreated(event.data);
    case 'session.ended':
      return handleSessionEnded(event.data);
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
