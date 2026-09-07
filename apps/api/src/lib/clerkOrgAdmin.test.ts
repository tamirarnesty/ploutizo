import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClerkAPIResponseError } from '@clerk/backend/errors';
import type { ClerkClient } from '@clerk/backend';
import {
  ClerkOrgAdminError,
  HOUSEHOLD_INVITE_ORG_ROLE,
  createClerkOrgAdminAdapter,
} from '@/lib/clerkOrgAdmin';

const clerkError = (status: number, code: string) =>
  new ClerkAPIResponseError('clerk failed', {
    status,
    data: [{ code, message: code }],
  });

const createInvitation = vi.fn();
const getOrganizationInvitationList = vi.fn();
const revokeOrganizationInvitation = vi.fn();
const deleteOrganizationMembership = vi.fn();

const mockClient = {
  organizations: {
    createOrganizationInvitation: createInvitation,
    getOrganizationInvitationList,
    revokeOrganizationInvitation,
    deleteOrganizationMembership,
  },
} as unknown as ClerkClient;

const orgAdmin = createClerkOrgAdminAdapter(() => mockClient);

beforeEach(() => {
  createInvitation.mockReset();
  getOrganizationInvitationList.mockReset();
  revokeOrganizationInvitation.mockReset();
  deleteOrganizationMembership.mockReset();
});

describe('createClerkOrgAdminAdapter.createInvitation', () => {
  it('sends org:admin invitations through the Clerk Backend SDK', async () => {
    createInvitation.mockResolvedValue({});
    await orgAdmin.createInvitation({
      organizationId: 'org_1',
      emailAddress: 'new@example.com',
    });
    expect(createInvitation).toHaveBeenCalledWith({
      organizationId: 'org_1',
      emailAddress: 'new@example.com',
      role: HOUSEHOLD_INVITE_ORG_ROLE,
    });
  });

  it('maps already-a-member Clerk codes', async () => {
    createInvitation.mockRejectedValue(
      clerkError(422, 'already_a_member_of_this_org')
    );
    await expect(
      orgAdmin.createInvitation({
        organizationId: 'org_1',
        emailAddress: 'existing@example.com',
      })
    ).rejects.toMatchObject({
      name: 'ClerkOrgAdminError',
      code: 'already_member',
    });

    createInvitation.mockRejectedValue(
      clerkError(422, 'already_a_member_in_organization')
    );
    await expect(
      orgAdmin.createInvitation({
        organizationId: 'org_1',
        emailAddress: 'existing@example.com',
      })
    ).rejects.toMatchObject({ code: 'already_member' });
  });

  it('maps pending, invalid-email, and quota Clerk codes', async () => {
    createInvitation.mockRejectedValue(
      clerkError(422, 'invitation_already_pending')
    );
    await expect(
      orgAdmin.createInvitation({
        organizationId: 'org_1',
        emailAddress: 'pending@example.com',
      })
    ).rejects.toMatchObject({ code: 'invitation_pending' });

    createInvitation.mockRejectedValue(
      clerkError(422, 'form_param_format_invalid')
    );
    await expect(
      orgAdmin.createInvitation({
        organizationId: 'org_1',
        emailAddress: 'bad',
      })
    ).rejects.toMatchObject({ code: 'invalid_email' });

    createInvitation.mockRejectedValue(clerkError(402, 'quota_exceeded'));
    await expect(
      orgAdmin.createInvitation({
        organizationId: 'org_1',
        emailAddress: 'new@example.com',
      })
    ).rejects.toMatchObject({ code: 'quota_exceeded' });
  });

  it('maps unknown Clerk failures', async () => {
    createInvitation.mockRejectedValue(clerkError(500, 'something_else'));
    await expect(
      orgAdmin.createInvitation({
        organizationId: 'org_1',
        emailAddress: 'new@example.com',
      })
    ).rejects.toMatchObject({ code: 'unknown' });
  });

  it('throws unavailable when the Clerk client is missing', async () => {
    const unavailable = createClerkOrgAdminAdapter(() => null);
    await expect(
      unavailable.createInvitation({
        organizationId: 'org_1',
        emailAddress: 'new@example.com',
      })
    ).rejects.toEqual(expect.any(ClerkOrgAdminError));
    await expect(
      unavailable.createInvitation({
        organizationId: 'org_1',
        emailAddress: 'new@example.com',
      })
    ).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('createClerkOrgAdminAdapter.listInvitations', () => {
  it('requests pending and expired invitations and maps to camelCase', async () => {
    getOrganizationInvitationList.mockResolvedValue({
      data: [
        {
          id: 'inv_abc',
          emailAddress: 'user@example.com',
          status: 'pending',
          createdAt: 1678886400000,
          expiresAt: 1681564800000,
        },
      ],
    });
    const rows = await orgAdmin.listInvitations('org_1');
    expect(getOrganizationInvitationList).toHaveBeenCalledWith({
      organizationId: 'org_1',
      status: ['pending', 'expired'],
      limit: 100,
    });
    expect(rows).toEqual([
      {
        id: 'inv_abc',
        email: 'user@example.com',
        status: 'pending',
        createdAt: new Date(1678886400000).toISOString(),
        expiresAt: new Date(1681564800000).toISOString(),
      },
    ]);
    expect(rows[0]).not.toHaveProperty('emailAddress');
    expect(rows[0]).not.toHaveProperty('created_at');
  });

  it('returns null expiresAt when Clerk omits it', async () => {
    getOrganizationInvitationList.mockResolvedValue({
      data: [
        {
          id: 'inv_abc',
          emailAddress: 'user@example.com',
          status: 'expired',
          createdAt: 1678886400000,
          expiresAt: null,
        },
      ],
    });
    const rows = await orgAdmin.listInvitations('org_1');
    expect(rows[0]?.expiresAt).toBeNull();
  });

  it('throws unknown when Clerk listing fails', async () => {
    getOrganizationInvitationList.mockRejectedValue(clerkError(500, 'boom'));
    await expect(orgAdmin.listInvitations('org_1')).rejects.toMatchObject({
      code: 'unknown',
    });
  });
});

describe('createClerkOrgAdminAdapter.revokeInvitation', () => {
  it('revokes through Clerk with requestingUserId', async () => {
    revokeOrganizationInvitation.mockResolvedValue({});
    await orgAdmin.revokeInvitation({
      organizationId: 'org_1',
      invitationId: 'inv_abc',
      requestingUserId: 'user_clerk_abc',
    });
    expect(revokeOrganizationInvitation).toHaveBeenCalledWith({
      organizationId: 'org_1',
      invitationId: 'inv_abc',
      requestingUserId: 'user_clerk_abc',
    });
  });

  it('treats Clerk 404 as success', async () => {
    revokeOrganizationInvitation.mockRejectedValue(
      clerkError(404, 'resource_not_found')
    );
    await expect(
      orgAdmin.revokeInvitation({
        organizationId: 'org_1',
        invitationId: 'inv_gone',
        requestingUserId: 'user_clerk_abc',
      })
    ).resolves.toBeUndefined();
  });

  it('throws unknown on non-404 Clerk failures', async () => {
    revokeOrganizationInvitation.mockRejectedValue(clerkError(500, 'boom'));
    await expect(
      orgAdmin.revokeInvitation({
        organizationId: 'org_1',
        invitationId: 'inv_abc',
        requestingUserId: 'user_clerk_abc',
      })
    ).rejects.toMatchObject({ code: 'unknown' });
  });
});

describe('createClerkOrgAdminAdapter.deleteMembership', () => {
  it('deletes the Clerk org membership by user id', async () => {
    deleteOrganizationMembership.mockResolvedValue({});
    await orgAdmin.deleteMembership({
      organizationId: 'org_1',
      clerkUserId: 'user_other',
    });
    expect(deleteOrganizationMembership).toHaveBeenCalledWith({
      organizationId: 'org_1',
      userId: 'user_other',
    });
  });

  it('treats Clerk 404 as success', async () => {
    deleteOrganizationMembership.mockRejectedValue(
      clerkError(404, 'resource_not_found')
    );
    await expect(
      orgAdmin.deleteMembership({
        organizationId: 'org_1',
        clerkUserId: 'user_gone',
      })
    ).resolves.toBeUndefined();
  });
});
