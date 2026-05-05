import { DomainError, NotFoundError } from '../lib/errors'
import {
  deleteOrgMember,
  fetchOrg,
  fetchOrgMemberWithUser,
  fetchOrgSettings,
  listOrgMembers,
  updateOrgSettings as updateOrgSettingsQuery,
} from '../lib/queries/households'
import type { InviteMemberFormSchema, updateHouseholdSettingsSchema } from '@ploutizo/validators'
import type { PendingInvitation } from '@ploutizo/types'
import type { z } from 'zod'

export async function getHousehold(orgId: string) {
  const row = await fetchOrg(orgId)
  return { name: row?.name ?? null, imageUrl: row?.imageUrl ?? null }
}

export async function getHouseholdSettings(orgId: string) {
  const row = await fetchOrgSettings(orgId)
  return { settlementThreshold: row?.settlementThreshold ?? null }
}

export async function updateHouseholdSettings(
  orgId: string,
  data: z.infer<typeof updateHouseholdSettingsSchema>
) {
  const updated = await updateOrgSettingsQuery(orgId, data.settlementThreshold ?? null)
  return { settlementThreshold: updated?.settlementThreshold ?? null }
}

export async function listMembers(orgId: string) {
  return listOrgMembers(orgId)
}

// Clerk REST API calls stay in service layer (they are business logic, not DB queries).
export async function inviteMember(
  orgId: string,
  data: z.infer<typeof InviteMemberFormSchema>
) {
  const clerkRes = await fetch(
    `https://api.clerk.com/v1/organizations/${orgId}/invitations`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_address: data.email, role: 'org:admin' }),
    }
  )
  if (!clerkRes.ok) {
    const clerkBody = await clerkRes.json() as { errors?: { code: string }[] }
    const code = clerkBody.errors?.[0]?.code
    if (code === 'already_a_member_of_this_org' || code === 'already_a_member_in_organization') {
      throw new DomainError(409, 'Already a member of this organisation.', 'ALREADY_MEMBER')
    }
    if (code === 'invitation_already_pending') {
      throw new DomainError(409, 'Invitation already pending.', 'INVITATION_PENDING')
    }
    if (code === 'form_param_format_invalid') {
      throw new DomainError(400, 'Invalid email address.', 'INVALID_EMAIL')
    }
    if (code === 'quota_exceeded') {
      throw new DomainError(402, 'Member quota exceeded.', 'QUOTA_EXCEEDED')
    }
    throw new DomainError(500, 'An unexpected error occurred.', 'UNKNOWN')
  }
  return { sent: true }
}

// callerClerkId: passed from route via getAuth(c).userId — tenantGuard does not set userId on context
export async function removeMember(
  memberId: string,
  orgId: string,
  callerClerkId: string | null | undefined
) {
  const member = await fetchOrgMemberWithUser(memberId, orgId)
  if (!member) throw new NotFoundError('Member not found.')

  // Server-side self-removal guard (T-03.2.1-02-01) — preserve existing behavior
  if (member.externalId === callerClerkId) {
    throw new DomainError(403, 'Cannot remove yourself from the organisation.', 'SELF_REMOVAL_FORBIDDEN')
  }

  // Remove from Clerk org before local DB to avoid split-brain
  const clerkRes = await fetch(
    `https://api.clerk.com/v1/organizations/${orgId}/memberships/${member.externalId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    }
  )
  if (!clerkRes.ok && clerkRes.status !== 404) {
    throw new DomainError(500, 'An unexpected error occurred.', 'UNKNOWN')
  }

  await deleteOrgMember(memberId)
  return { removed: true }
}

export async function listInvitations(orgId: string): Promise<PendingInvitation[]> {
  // Status filter MUST include both 'pending' and 'expired' so expired-state branch is reachable.
  // Clerk REST accepts repeated `status` query params: ?status=pending&status=expired
  const url = `https://api.clerk.com/v1/organizations/${orgId}/invitations?status=pending&status=expired&limit=100`
  const clerkRes = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  })
  if (!clerkRes.ok) {
    throw new DomainError(500, 'Failed to list invitations.', 'UNKNOWN')
  }
  // Clerk REST returns snake_case — map to camelCase here.
  // Timestamps are Unix MILLISECONDS — pass directly to new Date().
  const body = (await clerkRes.json()) as {
    data: {
      id: string
      email_address: string
      status: string
      created_at: number
      expires_at: number | null
    }[]
  }
  return body.data.map((inv) => ({
    id: inv.id,
    email: inv.email_address,
    status: inv.status as PendingInvitation['status'],
    createdAt: new Date(inv.created_at).toISOString(),
    expiresAt: inv.expires_at ? new Date(inv.expires_at).toISOString() : null,
  }))
}

// Clerk revoke endpoint is POST .../revoke (NOT DELETE) — requires requesting_user_id (otherwise 422).
// The internal ploutizo API exposes this as DELETE /api/households/invitations/:id (REST convention).
export async function revokeInvitation(
  orgId: string,
  invitationId: string,
  requestingUserId: string
) {
  const clerkRes = await fetch(
    `https://api.clerk.com/v1/organizations/${orgId}/invitations/${invitationId}/revoke`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requesting_user_id: requestingUserId }),
    }
  )
  if (!clerkRes.ok && clerkRes.status !== 404) {
    throw new DomainError(500, 'An unexpected error occurred.', 'UNKNOWN')
  }
  return { revoked: true }
}
