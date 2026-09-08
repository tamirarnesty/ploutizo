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
 * Copies Clerk person fields only: id, primary email, first, last, image URL.
 */
export type LocalUserRowInput = {
  externalId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

const primaryEmailFromUserJson = (data: UserJSON): string | undefined =>
  data.email_addresses.find((e) => e.id === data.primary_email_address_id)
    ?.email_address;

/** Map Clerk webhook `user.*` JSON (`UserJSON`) to the local `users` row shape. */
export const userJsonToLocalUserRow = (
  data: UserJSON
): LocalUserRowInput | null => {
  const primaryEmail = primaryEmailFromUserJson(data);
  if (!primaryEmail) return null;
  return {
    externalId: data.id,
    email: primaryEmail,
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
  return {
    externalId: user.id,
    email: primaryEmail,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    imageUrl: user.imageUrl,
  };
};

export type UpsertLocalUserConflict = 'ignore' | 'update';

/** Write Clerk person fields to local `users`, keyed by `external_id`. */
export const upsertLocalUser = async (
  row: LocalUserRowInput,
  conflict: UpsertLocalUserConflict
): Promise<void> => {
  const values = {
    externalId: row.externalId,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    imageUrl: row.imageUrl,
  };
  if (conflict === 'ignore') {
    await db
      .insert(users)
      .values(values)
      .onConflictDoNothing({ target: users.externalId });
    return;
  }
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.externalId,
    set: values,
  });
};

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
    })
    .onConflictDoUpdate({
      target: [orgMembers.orgId, orgMembers.userId],
      set: {
        externalId: params.clerkMembershipId,
        membershipCreatedAt: params.membershipCreatedAt,
        role,
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
 * `user.created` never landed). Person names live on `users`; roster labels
 * are derived at read time.
 */
export const updateLocalUserFromUserJson = async (
  data: UserJSON
): Promise<void> => {
  const row = userJsonToLocalUserRow(data);
  if (!row) return;

  await upsertLocalUser(row, 'update');
};

/**
 * Applies `organizationMembership.updated` webhook fields for one household.
 * Writes mapped role only. Does not heal a missing local `users` row —
 * request-time sync covers the caller.
 */
export const updateOrgMemberFromMembershipJson = async (
  data: OrganizationMembershipJSON
): Promise<void> => {
  const clerkUserId = data.public_user_data.user_id;
  const appUserId = await findLocalUserIdByClerkId(clerkUserId);
  if (appUserId === undefined) return;

  const role = mapClerkOrgRoleToAppRole(data.role, {
    orgId: data.organization.id,
    appUserId,
  });

  await db
    .update(orgMembers)
    .set({ role })
    .where(
      and(
        eq(orgMembers.orgId, data.organization.id),
        eq(orgMembers.userId, appUserId),
        eq(orgMembers.externalId, data.id)
      )
    );
};
