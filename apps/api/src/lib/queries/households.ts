import { db } from '@ploutizo/db';
import { orgMembers, orgs, users } from '@ploutizo/db/schema';
import { and, eq } from 'drizzle-orm';

// GET / — fetch org name and imageUrl
export const fetchOrg = async (orgId: string) => {
  const rows = await db
    .select({ name: orgs.name, imageUrl: orgs.imageUrl })
    .from(orgs)
    .where(eq(orgs.id, orgId));
  return rows.at(0) ?? null;
};

// GET /settings — fetch org settlementThreshold
export const fetchOrgSettings = async (orgId: string) => {
  const rows = await db
    .select({ settlementThreshold: orgs.settlementThreshold })
    .from(orgs)
    .where(eq(orgs.id, orgId));
  return rows.at(0) ?? null;
};

// PATCH /settings — update settlementThreshold; returns updated row or null
export const updateOrgSettings = async (
  orgId: string,
  settlementThreshold: number | null
) => {
  const rows = await db
    .update(orgs)
    .set({ settlementThreshold, updatedAt: new Date() })
    .where(eq(orgs.id, orgId))
    .returning();
  return rows.at(0) ?? null;
};

// GET /members — list members with user join for avatar/name fields
export const listOrgMembers = async (orgId: string) => {
  return db
    .select({
      id: orgMembers.id,
      orgId: orgMembers.orgId,
      displayName: orgMembers.displayName,
      role: orgMembers.role,
      joinedAt: orgMembers.joinedAt,
      externalId: users.externalId,
      imageUrl: users.imageUrl,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, orgId))
    .orderBy(orgMembers.displayName);
};

// DELETE /members/:memberId — look up member's Clerk externalId for self-removal guard
export const fetchOrgMemberWithUser = async (
  memberId: string,
  orgId: string
) => {
  const rows = await db
    .select({ externalId: users.externalId })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId)));
  return rows.at(0) ?? null;
};

// DELETE /members/:memberId — remove local org_members row
export const deleteOrgMember = async (memberId: string) => {
  await db.delete(orgMembers).where(eq(orgMembers.id, memberId));
};
