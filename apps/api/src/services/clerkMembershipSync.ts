import { db } from '@ploutizo/db';
import { users } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';
import { getClerkServerClient } from '../lib/clerkServerClient';
import {
  buildOrgMemberDisplayName,
  clerkBackendUserToLocalUserRow,
  insertLocalUserIfAbsent,
  insertOrgMemberIfAbsent,
} from './clerkDbMirror';

/**
 * When Clerk webhooks never reached this environment, `users` and `org_members`
 * rows are missing even though the session has a valid org + user. That breaks
 * household member pickers (e.g. transaction assignees). Uses the same DB
 * mirror helpers as webhook handlers (`user.created`, `organizationMembership.created`).
 */
export const ensureCallerSyncedToOrg = async (
  orgId: string,
  clerkUserId: string | null | undefined
): Promise<void> => {
  if (!clerkUserId) return;

  const clerk = getClerkServerClient();
  if (!clerk) return;

  const clerkUser = await clerk.users.getUser(clerkUserId);

  const localUser = clerkBackendUserToLocalUserRow(clerkUser);
  if (!localUser) return;
  await insertLocalUserIfAbsent(localUser);

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.externalId, clerkUser.id))
    .limit(1);
  const dbUser = rows.at(0);
  if (dbUser === undefined) return;

  const { data: memberships } = await clerk.users.getOrganizationMembershipList({
    userId: clerkUserId,
    limit: 100,
  });
  const match = memberships.find((m) => m.organization.id === orgId);
  if (!match) return;

  const pud = match.publicUserData;
  const fallbackUserId = pud?.userId ?? clerkUser.id;
  const displayName = buildOrgMemberDisplayName({
    firstName: pud?.firstName,
    lastName: pud?.lastName,
    fallbackUserId,
  });

  await insertOrgMemberIfAbsent({
    orgId,
    appUserId: dbUser.id,
    displayName,
    clerkOrgRole: match.role,
  });
};
