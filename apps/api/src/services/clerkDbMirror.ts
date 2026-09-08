import { db } from '@ploutizo/db';
import { orgMembers, users } from '@ploutizo/db/schema';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { mapClerkOrgRoleToAppRole } from './clerkRoleMapping';
import type {
  OrganizationMembershipJSON,
  User,
  UserJSON,
} from '@clerk/backend';

/** Resolve local `users.id` from a Clerk user id; `undefined` when no mirror row exists. */
export const findLocalUserIdByClerkId = async (
  clerkUserId: string
): Promise<string | undefined> => {
  const row = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.externalId, clerkUserId))
    .limit(1)
    .then((rows) => rows.at(0));
  return row?.id;
};

/** Hard-delete `org_members` when the stored Clerk membership id matches. */
export const deleteOrgMemberByClerkMembershipId = async (params: {
  orgId: string;
  appUserId: string;
  clerkMembershipId: string;
}): Promise<void> => {
  await db
    .delete(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, params.orgId),
        eq(orgMembers.userId, params.appUserId),
        eq(orgMembers.externalId, params.clerkMembershipId)
      )
    );
};

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
export const userJsonToLocalUserRow = (
  data: UserJSON
): LocalUserRowInput | null => {
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
export const clerkBackendUserToLocalUserRow = (
  user: User
): LocalUserRowInput | null => {
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
    imageUrl: user.imageUrl,
  };
};

/**
 * Insert local `users` row if absent — same semantics as `user.created` webhook
 * (`onConflictDoNothing` on `external_id`).
 */
export const insertLocalUserIfAbsent = async (
  row: LocalUserRowInput
): Promise<void> => {
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
  joinClerkFirstLast(params.firstName, params.lastName) ??
  params.fallbackUserId;

/**
 * True when an incoming Clerk membership should replace the stored mirror identity.
 * `null` stored timestamps are treated as unset so the first post-migration create can populate.
 */
export const shouldReplaceMirroredMembership = (
  storedCreatedAt: Date | null | undefined,
  incomingCreatedAt: Date
): boolean =>
  storedCreatedAt == null ||
  storedCreatedAt.getTime() < incomingCreatedAt.getTime();

/**
 * Insert local `org_members` row if absent — same semantics as
 * `organizationMembership.created` webhook. On conflict, replace the stored
 * Clerk membership identity only when the incoming membership is newer.
 */
export const insertOrgMemberIfAbsent = async (params: {
  orgId: string;
  appUserId: string;
  displayName: string;
  clerkMembershipId: string;
  /** Clerk organization membership `created_at`. */
  membershipCreatedAt: Date;
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
      externalId: params.clerkMembershipId,
      membershipCreatedAt: params.membershipCreatedAt,
      role,
      displayName: params.displayName,
    })
    .onConflictDoUpdate({
      target: [orgMembers.orgId, orgMembers.userId],
      set: {
        externalId: params.clerkMembershipId,
        membershipCreatedAt: params.membershipCreatedAt,
        role,
        displayName: params.displayName,
      },
      setWhere: or(
        isNull(orgMembers.membershipCreatedAt),
        lt(orgMembers.membershipCreatedAt, params.membershipCreatedAt)
      ),
    });
};

/**
 * Hard-delete local `org_members` row when Clerk membership is removed — same semantics
 * as in-app remove and `organizationMembership.deleted` webhook. Idempotent when the row
 * is already gone (including after in-app remove).
 */
export const deleteOrgMemberIfPresent = async (params: {
  orgId: string;
  clerkUserId: string;
  clerkMembershipId: string;
}): Promise<void> => {
  const appUserId = await findLocalUserIdByClerkId(params.clerkUserId);
  if (!appUserId) return;

  await deleteOrgMemberByClerkMembershipId({
    orgId: params.orgId,
    appUserId,
    clerkMembershipId: params.clerkMembershipId,
  });
};

/**
 * Applies `user.updated` webhook fields: upsert local `users` (create when
 * `user.created` never landed) and refresh that person's `org_members.display_name`
 * in every household they belong to.
 */
export const updateLocalUserFromUserJson = async (
  data: UserJSON
): Promise<void> => {
  const row = userJsonToLocalUserRow(data);
  if (!row) return;

  const upserted = await db
    .insert(users)
    .values({
      externalId: row.externalId,
      email: row.email,
      fullName: row.fullName,
      firstName: row.firstName,
      lastName: row.lastName,
      imageUrl: row.imageUrl,
    })
    .onConflictDoUpdate({
      target: users.externalId,
      set: {
        email: row.email,
        fullName: row.fullName,
        firstName: row.firstName,
        lastName: row.lastName,
        imageUrl: row.imageUrl,
      },
    })
    .returning({ id: users.id });

  const appUserId = upserted.at(0)?.id;
  if (appUserId === undefined) return;

  const displayName = buildOrgMemberDisplayName({
    firstName: row.firstName,
    lastName: row.lastName,
    fallbackUserId: row.externalId,
  });

  await db
    .update(orgMembers)
    .set({ displayName })
    .where(eq(orgMembers.userId, appUserId));
};

/**
 * Applies `organizationMembership.updated` webhook fields for one household.
 * Does not heal a missing local `users` row — request-time sync covers the caller.
 */
export const updateOrgMemberFromMembershipJson = async (
  data: OrganizationMembershipJSON
): Promise<void> => {
  const clerkUserId = data.public_user_data.user_id;
  const appUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.externalId, clerkUserId))
    .then((rows) => rows.at(0));

  if (appUser === undefined) return;

  const displayName = buildOrgMemberDisplayName({
    firstName: data.public_user_data.first_name,
    lastName: data.public_user_data.last_name,
    fallbackUserId: clerkUserId,
  });
  const role = mapClerkOrgRoleToAppRole(data.role, {
    orgId: data.organization.id,
    appUserId: appUser.id,
  });

  await db
    .update(orgMembers)
    .set({ displayName, role })
    .where(
      and(
        eq(orgMembers.orgId, data.organization.id),
        eq(orgMembers.userId, appUser.id)
      )
    );
};
