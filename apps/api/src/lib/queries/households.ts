import { db } from '@ploutizo/db';
import { orgMembers, orgs, users } from '@ploutizo/db/schema';
import { and, eq } from 'drizzle-orm';

// GET / — fetch org name and imageUrl
export async function fetchOrg(orgId: string) {
  const rows = await db
    .select({ name: orgs.name, imageUrl: orgs.imageUrl })
    .from(orgs)
    .where(eq(orgs.id, orgId));
  return rows.at(0) ?? null;
}

// GET /settings — fetch org settlementThreshold
export async function fetchOrgSettings(orgId: string) {
  const rows = await db
    .select({ settlementThreshold: orgs.settlementThreshold })
    .from(orgs)
    .where(eq(orgs.id, orgId));
  return rows.at(0) ?? null;
}

// PATCH /settings — update settlementThreshold; returns updated row or null
export async function updateOrgSettings(
  orgId: string,
  settlementThreshold: number | null
) {
  const rows = await db
    .update(orgs)
    .set({ settlementThreshold, updatedAt: new Date() })
    .where(eq(orgs.id, orgId))
    .returning();
  return rows.at(0) ?? null;
}

// GET /members — list members with user join for avatar/name fields
export async function listOrgMembers(orgId: string) {
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
}

// DELETE /members/:memberId — look up member's Clerk externalId for self-removal guard
export async function fetchOrgMemberWithUser(memberId: string, orgId: string) {
  const rows = await db
    .select({ externalId: users.externalId })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId)));
  return rows.at(0) ?? null;
}

// DELETE /members/:memberId — remove local org_members row
export async function deleteOrgMember(memberId: string) {
  await db.delete(orgMembers).where(eq(orgMembers.id, memberId));
}
