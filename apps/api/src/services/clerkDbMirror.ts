import { db } from '@ploutizo/db';
import { orgMembers, users } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';
import type { User, UserJSON } from '@clerk/backend';

/**
 * Normalized user row for `users` inserts — shared by Clerk webhooks and
 * `ensureCallerSyncedToOrg` so webhook JSON and Backend SDK shapes converge here.
 */
export type LocalUserRowInput = {
  externalId: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

/** Map Clerk webhook `user.*` JSON (`UserJSON`) to the local `users` row shape. */
export const userJsonToLocalUserRow = (data: UserJSON): LocalUserRowInput | null => {
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;
  if (!primaryEmail) return null;
  const fullName =
    [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  return {
    externalId: data.id,
    email: primaryEmail,
    fullName,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
    imageUrl: data.image_url,
  };
};

/** Map Clerk Backend API `User` to the same local row shape as `userJsonToLocalUserRow`. */
export const clerkBackendUserToLocalUserRow = (user: User): LocalUserRowInput | null => {
  const primaryEmail = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress;
  if (!primaryEmail) return null;
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
  return {
    externalId: user.id,
    email: primaryEmail,
    fullName,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    imageUrl: user.imageUrl,
  };
};

/**
 * Insert local `users` row if absent — same semantics as `user.created` webhook
 * (`onConflictDoNothing` on `external_id`).
 */
export const insertLocalUserIfAbsent = async (row: LocalUserRowInput): Promise<void> => {
  await db
    .insert(users)
    .values({
      externalId: row.externalId,
      email: row.email,
      fullName: row.fullName,
      firstName: row.firstName,
      lastName: row.lastName,
      imageUrl: row.imageUrl,
    })
    .onConflictDoNothing({ target: users.externalId });
};

/**
 * Same display-name rule as `organizationMembership.created` webhook:
 * `first_name` + `last_name`, else Clerk user id string.
 */
export const buildOrgMemberDisplayName = (params: {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  fallbackUserId: string;
}): string =>
  [params.firstName, params.lastName].filter(Boolean).join(' ') ||
  params.fallbackUserId;

/**
 * Insert local `org_members` row if absent — same semantics as
 * `organizationMembership.created` webhook (`onConflictDoNothing` on org + user).
 */
export const insertOrgMemberIfAbsent = async (params: {
  orgId: string;
  appUserId: string;
  displayName: string;
}): Promise<void> => {
  await db
    .insert(orgMembers)
    .values({
      orgId: params.orgId,
      userId: params.appUserId,
      role: 'admin', // DB enum only supports 'admin' in v1; Clerk role ignored until roles expand
      displayName: params.displayName,
    })
    .onConflictDoNothing({ target: [orgMembers.orgId, orgMembers.userId] });
};

/** Applies `user.updated` webhook fields — mirrors previous `handleUserUpdated` logic. */
export const updateLocalUserFromUserJson = async (data: UserJSON): Promise<void> => {
  const row = userJsonToLocalUserRow(data);
  if (!row) return;
  await db
    .update(users)
    .set({
      email: row.email,
      fullName: row.fullName,
      firstName: row.firstName,
      lastName: row.lastName,
      imageUrl: row.imageUrl,
    })
    .where(eq(users.externalId, row.externalId));
};
