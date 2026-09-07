import type {
  InviteMemberFormSchema,
  updateHouseholdSettingsSchema,
} from '@ploutizo/validators';
import type { PendingInvitation } from '@ploutizo/types';
import { ClerkOrgAdminError, clerkOrgAdmin } from '../lib/clerkOrgAdmin';
import { DomainError, NotFoundError } from '../lib/errors';
import {
  deleteOrgMember,
  fetchOrg,
  fetchOrgMemberWithUser,
  fetchOrgSettings,
  listOrgMembers,
  updateOrgSettings as updateOrgSettingsQuery,
} from '../lib/queries/households';
import type { ClerkOrgAdminPort } from '../lib/clerkOrgAdmin';
import type { z } from 'zod';

export const getHousehold = async (orgId: string) => {
  const row = await fetchOrg(orgId);
  return { name: row?.name ?? null, imageUrl: row?.imageUrl ?? null };
};

export const getHouseholdSettings = async (orgId: string) => {
  const row = await fetchOrgSettings(orgId);
  return { settlementThreshold: row?.settlementThreshold ?? null };
};

export const updateHouseholdSettings = async (
  orgId: string,
  data: z.infer<typeof updateHouseholdSettingsSchema>
) => {
  const updated = await updateOrgSettingsQuery(
    orgId,
    data.settlementThreshold ?? null
  );
  return { settlementThreshold: updated?.settlementThreshold ?? null };
};

export const listMembers = async (orgId: string) => {
  return listOrgMembers(orgId);
};

const mapInviteError = (err: unknown): DomainError => {
  if (err instanceof ClerkOrgAdminError) {
    switch (err.code) {
      case 'already_member':
        return new DomainError(
          409,
          'Already a member of this organisation.',
          'ALREADY_MEMBER'
        );
      case 'invitation_pending':
        return new DomainError(
          409,
          'Invitation already pending.',
          'INVITATION_PENDING'
        );
      case 'invalid_email':
        return new DomainError(400, 'Invalid email address.', 'INVALID_EMAIL');
      case 'quota_exceeded':
        return new DomainError(402, 'Member quota exceeded.', 'QUOTA_EXCEEDED');
      default:
        return new DomainError(500, 'An unexpected error occurred.', 'UNKNOWN');
    }
  }
  return new DomainError(500, 'An unexpected error occurred.', 'UNKNOWN');
};

export const inviteMember = async (
  orgId: string,
  data: z.infer<typeof InviteMemberFormSchema>,
  orgAdmin: ClerkOrgAdminPort = clerkOrgAdmin
) => {
  try {
    await orgAdmin.createInvitation({
      organizationId: orgId,
      emailAddress: data.email,
    });
  } catch (err) {
    throw mapInviteError(err);
  }
  return { sent: true };
};

// callerClerkId: passed from route via getAuth(c).userId — tenantGuard does not set userId on context
export const removeMember = async (
  memberId: string,
  orgId: string,
  callerClerkId: string | null | undefined,
  orgAdmin: ClerkOrgAdminPort = clerkOrgAdmin
) => {
  const member = await fetchOrgMemberWithUser(memberId, orgId);
  if (!member) throw new NotFoundError('Member not found.');

  // Server-side self-removal guard (T-03.2.1-02-01) — preserve existing behavior
  if (member.externalId === callerClerkId) {
    throw new DomainError(
      403,
      'Cannot remove yourself from the organisation.',
      'SELF_REMOVAL_FORBIDDEN'
    );
  }

  // Remove from Clerk org before local DB to avoid split-brain
  try {
    await orgAdmin.deleteMembership({
      organizationId: orgId,
      clerkUserId: member.externalId,
    });
  } catch {
    throw new DomainError(500, 'An unexpected error occurred.', 'UNKNOWN');
  }

  await deleteOrgMember(memberId);
  return { removed: true };
};

export const listInvitations = async (
  orgId: string,
  orgAdmin: ClerkOrgAdminPort = clerkOrgAdmin
): Promise<PendingInvitation[]> => {
  try {
    return await orgAdmin.listInvitations(orgId);
  } catch {
    throw new DomainError(500, 'Failed to list invitations.', 'UNKNOWN');
  }
};

export const revokeInvitation = async (
  orgId: string,
  invitationId: string,
  requestingUserId: string,
  orgAdmin: ClerkOrgAdminPort = clerkOrgAdmin
) => {
  try {
    await orgAdmin.revokeInvitation({
      organizationId: orgId,
      invitationId,
      requestingUserId,
    });
  } catch {
    throw new DomainError(500, 'An unexpected error occurred.', 'UNKNOWN');
  }
  return { revoked: true };
};
