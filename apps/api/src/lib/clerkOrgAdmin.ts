import { isClerkAPIResponseError } from '@clerk/backend/errors';
import type { PendingInvitation } from '@ploutizo/types';
import type { ClerkClient } from '@clerk/backend';
import { getClerkServerClient } from '@/lib/clerkServerClient';

/** Clerk org role used for household member invitations. */
export const HOUSEHOLD_INVITE_ORG_ROLE = 'org:admin' as const;

const INVITATION_LIST_STATUSES = ['pending', 'expired'] as const;
const INVITATION_LIST_LIMIT = 100;

export type ClerkOrgAdminErrorCode =
  | 'already_member'
  | 'invitation_pending'
  | 'invalid_email'
  | 'quota_exceeded'
  | 'unavailable'
  | 'unknown';

export class ClerkOrgAdminError extends Error {
  constructor(public readonly code: ClerkOrgAdminErrorCode) {
    super(code);
    this.name = 'ClerkOrgAdminError';
  }
}

export type ClerkOrgAdminInvitation = PendingInvitation;

export type ClerkOrgAdminPort = {
  createInvitation: (input: {
    organizationId: string;
    emailAddress: string;
  }) => Promise<void>;
  listInvitations: (
    organizationId: string
  ) => Promise<ClerkOrgAdminInvitation[]>;
  revokeInvitation: (input: {
    organizationId: string;
    invitationId: string;
    requestingUserId: string;
  }) => Promise<void>;
  deleteMembership: (input: {
    organizationId: string;
    clerkUserId: string;
  }) => Promise<void>;
};

const toIsoTimestamp = (unixMs: number): string =>
  new Date(unixMs).toISOString();

const toOptionalIsoTimestamp = (
  unixMs: number | null | undefined
): string | null => (unixMs == null ? null : toIsoTimestamp(unixMs));

const toInvitationStatus = (
  status: string | undefined
): PendingInvitation['status'] => {
  if (
    status === 'pending' ||
    status === 'accepted' ||
    status === 'revoked' ||
    status === 'expired'
  ) {
    return status;
  }
  return (status ?? 'pending') as PendingInvitation['status'];
};

const clerkErrorCode = (err: unknown): string | undefined => {
  if (!isClerkAPIResponseError(err)) return undefined;
  return err.errors[0]?.code;
};

const isClerkNotFound = (err: unknown): boolean =>
  isClerkAPIResponseError(err) && err.status === 404;

const mapCreateInvitationError = (err: unknown): ClerkOrgAdminError => {
  const code = clerkErrorCode(err);
  if (
    code === 'already_a_member_of_this_org' ||
    code === 'already_a_member_in_organization'
  ) {
    return new ClerkOrgAdminError('already_member');
  }
  if (code === 'invitation_already_pending') {
    return new ClerkOrgAdminError('invitation_pending');
  }
  if (code === 'form_param_format_invalid') {
    return new ClerkOrgAdminError('invalid_email');
  }
  if (code === 'quota_exceeded') {
    return new ClerkOrgAdminError('quota_exceeded');
  }
  return new ClerkOrgAdminError('unknown');
};

const requireClient = (getClient: () => ClerkClient | null): ClerkClient => {
  const client = getClient();
  if (!client) {
    throw new ClerkOrgAdminError('unavailable');
  }
  return client;
};

const ignoreNotFound = async (op: () => Promise<unknown>): Promise<void> => {
  try {
    await op();
  } catch (err) {
    if (isClerkNotFound(err)) return;
    throw new ClerkOrgAdminError('unknown');
  }
};

export const createClerkOrgAdminAdapter = (
  getClient: () => ClerkClient | null = getClerkServerClient
): ClerkOrgAdminPort => ({
  createInvitation: async ({ organizationId, emailAddress }) => {
    const clerk = requireClient(getClient);
    try {
      await clerk.organizations.createOrganizationInvitation({
        organizationId,
        emailAddress,
        role: HOUSEHOLD_INVITE_ORG_ROLE,
      });
    } catch (err) {
      if (err instanceof ClerkOrgAdminError) throw err;
      throw mapCreateInvitationError(err);
    }
  },

  listInvitations: async (organizationId) => {
    const clerk = requireClient(getClient);
    try {
      const { data } = await clerk.organizations.getOrganizationInvitationList({
        organizationId,
        status: [...INVITATION_LIST_STATUSES],
        limit: INVITATION_LIST_LIMIT,
      });
      return data.map((invitation) => ({
        id: invitation.id,
        email: invitation.emailAddress,
        status: toInvitationStatus(invitation.status),
        createdAt: toIsoTimestamp(invitation.createdAt),
        expiresAt: toOptionalIsoTimestamp(invitation.expiresAt),
      }));
    } catch (err) {
      if (err instanceof ClerkOrgAdminError) throw err;
      throw new ClerkOrgAdminError('unknown');
    }
  },

  revokeInvitation: async ({
    organizationId,
    invitationId,
    requestingUserId,
  }) => {
    const clerk = requireClient(getClient);
    await ignoreNotFound(() =>
      clerk.organizations.revokeOrganizationInvitation({
        organizationId,
        invitationId,
        requestingUserId,
      })
    );
  },

  deleteMembership: async ({ organizationId, clerkUserId }) => {
    const clerk = requireClient(getClient);
    await ignoreNotFound(() =>
      clerk.organizations.deleteOrganizationMembership({
        organizationId,
        userId: clerkUserId,
      })
    );
  },
});

/** Default org-admin port backed by the Clerk Backend SDK singleton. */
export const clerkOrgAdmin: ClerkOrgAdminPort = createClerkOrgAdminAdapter();
