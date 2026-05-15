import { db } from '@ploutizo/db';
import { orgMembers, users } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';
import { mapClerkOrgRoleToAppRole } from './clerkRoleMapping';
import type { User, UserJSON } from '@clerk/backend';

/**
 * Normalized user row for `users` inserts — shared by Clerk webhooks and
 * `ensureCallerSyncedToOrg` so webhook JSON and Backend SDK shapes converge here.
 *
 * `fullName` mirrors Clerk’s joined name and matches the existing `users.full_name`
 * column (used in API payloads and search); `firstName` / `lastName` stay the
 * structured source of truth when Clerk sends them.
 */
export type LocalUserRowInput = {
  externalId: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

/** Join Clerk first + last; `null` when both absent (unlike membership display, which falls back to an id). */
export const joinClerkFirstLast = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null => {
  const s = [firstName, lastName].filter(Boolean).join(' ');
  return s.length > 0 ? s : null;
};

/** Map Clerk webhook `user.*` JSON (`UserJSON`) to the local `users` row shape. */
export const userJsonToLocalUserRow = (data: UserJSON): LocalUserRowInput | null => {
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;
  if (!primaryEmail) return null;
  const fullName = joinClerkFirstLast(data.first_name, data.last_name);
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
  const fullName = joinClerkFirstLast(user.firstName, user.lastName);
  return {
    externalId: user.id,
    email: primaryEmail,
    fullName,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    imageUrl: user.imageUrl ?? null,
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
  joinClerkFirstLast(params.firstName, params.lastName) ?? params.fallbackUserId;

/**
 * Insert local `org_members` row if absent — same semantics as
 * `organizationMembership.created` webhook (`onConflictDoNothing` on org + user).
 */
export const insertOrgMemberIfAbsent = async (params: {
  orgId: string;
  appUserId: string;
  displayName: string;
  /** Clerk org role (e.g. `org:admin`); mapped via {@link mapClerkOrgRoleToAppRole}. */
  clerkOrgRole?: string | null;
}): Promise<void> => {
  const role = mapClerkOrgRoleToAppRole(params.clerkOrgRole, {
    orgId: params.orgId,
    appUserId: params.appUserId,
  });
  await db
    .insert(orgMembers)
    .values({
      orgId: params.orgId,
      userId: params.appUserId,
      role,
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
