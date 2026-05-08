import { createClerkClient } from '@clerk/backend';
import { db } from '@ploutizo/db';
import { orgMembers, orgs, users } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';

/**
 * When Clerk webhooks never reached this environment, `users` and `org_members`
 * rows are missing even though the session has a valid org + user. That breaks
 * household member pickers (e.g. transaction assignees). This sync pulls the
 * current user from Clerk and ensures local mirror rows exist for the active org.
 */
export const ensureCallerSyncedToOrg = async (
  orgId: string,
  clerkUserId: string | null | undefined
): Promise<void> => {
  if (!clerkUserId) return;
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return;

  const clerk = createClerkClient({ secretKey: secret });

  const clerkUser = await clerk.users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress;
  if (!primaryEmail) return;

  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;

  await db
    .insert(users)
    .values({
      externalId: clerkUser.id,
      email: primaryEmail,
      fullName,
      firstName: clerkUser.firstName ?? null,
      lastName: clerkUser.lastName ?? null,
      imageUrl: clerkUser.imageUrl,
    })
    .onConflictDoNothing({ target: users.externalId });

  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.externalId, clerkUser.id))
    .limit(1);

  const { data: memberships } = await clerk.users.getOrganizationMembershipList({
    userId: clerkUserId,
    limit: 100,
  });
  const match = memberships.find((m) => m.organization.id === orgId);
  if (!match) return;

  const pud = match.publicUserData;
  const displayName =
    [pud?.firstName, pud?.lastName].filter(Boolean).join(' ') ||
    pud?.identifier ||
    clerkUser.id;

  await db.insert(orgMembers).values({
    orgId,
    userId: dbUser.id,
    role: 'admin',
    displayName,
  }).onConflictDoNothing({ target: [orgMembers.orgId, orgMembers.userId] });

  const orgName = match.organization.name;
  if (orgName) {
    await db
      .update(orgs)
      .set({ name: orgName, updatedAt: new Date() })
      .where(eq(orgs.id, orgId));
  }
};
