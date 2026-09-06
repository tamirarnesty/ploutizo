import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClerkOrgAdminPort } from '@/lib/clerkOrgAdmin';
import { DomainError, NotFoundError } from '@/lib/errors';
import { ClerkOrgAdminError } from '@/lib/clerkOrgAdmin';
import {
  deleteOrgMember,
  fetchOrgMemberWithUser,
} from '@/lib/queries/households';
import {
  inviteMember,
  listInvitations,
  removeMember,
  revokeInvitation,
} from '@/services/households';

vi.mock('@/lib/queries/households', () => ({
  deleteOrgMember: vi.fn(),
  fetchOrg: vi.fn(),
  fetchOrgMemberWithUser: vi.fn(),
  fetchOrgSettings: vi.fn(),
  listOrgMembers: vi.fn(),
  updateOrgSettings: vi.fn(),
}));

const createMockOrgAdmin = (): ClerkOrgAdminPort => ({
  createInvitation: vi.fn().mockResolvedValue(undefined),
  listInvitations: vi.fn().mockResolvedValue([]),
  revokeInvitation: vi.fn().mockResolvedValue(undefined),
  deleteMembership: vi.fn().mockResolvedValue(undefined),
});

describe('inviteMember', () => {
  let orgAdmin: ClerkOrgAdminPort;

  beforeEach(() => {
    orgAdmin = createMockOrgAdmin();
  });

  it('returns { sent: true } after a successful org-admin invite', async () => {
    const result = await inviteMember(
      'org_1',
      { email: 'new@example.com' },
      orgAdmin
    );
    expect(result).toEqual({ sent: true });
    expect(orgAdmin.createInvitation).toHaveBeenCalledWith({
      organizationId: 'org_1',
      emailAddress: 'new@example.com',
    });
  });

  it('maps already_member to 409 ALREADY_MEMBER', async () => {
    vi.mocked(orgAdmin.createInvitation).mockRejectedValue(
      new ClerkOrgAdminError('already_member')
    );
    const err = await inviteMember(
      'org_1',
      { email: 'existing@example.com' },
      orgAdmin
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 409,
      code: 'ALREADY_MEMBER',
      message: 'Already a member of this organisation.',
    });
  });

  it('maps invitation_pending to 409 INVITATION_PENDING', async () => {
    vi.mocked(orgAdmin.createInvitation).mockRejectedValue(
      new ClerkOrgAdminError('invitation_pending')
    );
    const err = await inviteMember(
      'org_1',
      { email: 'pending@example.com' },
      orgAdmin
    ).catch((e: unknown) => e);
    expect(err).toMatchObject({
      statusCode: 409,
      code: 'INVITATION_PENDING',
    });
  });

  it('maps invalid_email and quota_exceeded', async () => {
    vi.mocked(orgAdmin.createInvitation).mockRejectedValue(
      new ClerkOrgAdminError('invalid_email')
    );
    await expect(
      inviteMember('org_1', { email: 'bad@example.com' }, orgAdmin)
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_EMAIL' });

    vi.mocked(orgAdmin.createInvitation).mockRejectedValue(
      new ClerkOrgAdminError('quota_exceeded')
    );
    await expect(
      inviteMember('org_1', { email: 'new@example.com' }, orgAdmin)
    ).rejects.toMatchObject({ statusCode: 402, code: 'QUOTA_EXCEEDED' });
  });

  it('maps unknown org-admin failures to 500 UNKNOWN', async () => {
    vi.mocked(orgAdmin.createInvitation).mockRejectedValue(
      new ClerkOrgAdminError('unknown')
    );
    await expect(
      inviteMember('org_1', { email: 'new@example.com' }, orgAdmin)
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'UNKNOWN',
      message: 'An unexpected error occurred.',
    });
  });
});

describe('listInvitations', () => {
  it('returns invitations from the org-admin port', async () => {
    const orgAdmin = createMockOrgAdmin();
    const invitations = [
      {
        id: 'inv_abc',
        email: 'user@example.com',
        status: 'pending' as const,
        createdAt: new Date(1678886400000).toISOString(),
        expiresAt: new Date(1681564800000).toISOString(),
      },
    ];
    vi.mocked(orgAdmin.listInvitations).mockResolvedValue(invitations);
    await expect(listInvitations('org_1', orgAdmin)).resolves.toEqual(
      invitations
    );
  });

  it('maps port failures to 500 Failed to list invitations', async () => {
    const orgAdmin = createMockOrgAdmin();
    vi.mocked(orgAdmin.listInvitations).mockRejectedValue(
      new ClerkOrgAdminError('unknown')
    );
    await expect(listInvitations('org_1', orgAdmin)).rejects.toMatchObject({
      statusCode: 500,
      code: 'UNKNOWN',
      message: 'Failed to list invitations.',
    });
  });
});

describe('revokeInvitation', () => {
  it('returns { revoked: true } after a successful revoke', async () => {
    const orgAdmin = createMockOrgAdmin();
    const result = await revokeInvitation(
      'org_1',
      'inv_abc',
      'user_clerk_abc',
      orgAdmin
    );
    expect(result).toEqual({ revoked: true });
    expect(orgAdmin.revokeInvitation).toHaveBeenCalledWith({
      organizationId: 'org_1',
      invitationId: 'inv_abc',
      requestingUserId: 'user_clerk_abc',
    });
  });

  it('maps port failures to 500 UNKNOWN', async () => {
    const orgAdmin = createMockOrgAdmin();
    vi.mocked(orgAdmin.revokeInvitation).mockRejectedValue(
      new ClerkOrgAdminError('unknown')
    );
    await expect(
      revokeInvitation('org_1', 'inv_abc', 'user_clerk_abc', orgAdmin)
    ).rejects.toMatchObject({ statusCode: 500, code: 'UNKNOWN' });
  });
});

describe('removeMember', () => {
  beforeEach(() => {
    vi.mocked(fetchOrgMemberWithUser).mockReset();
    vi.mocked(deleteOrgMember).mockReset();
  });

  it('deletes Clerk membership then the local row', async () => {
    const orgAdmin = createMockOrgAdmin();
    vi.mocked(fetchOrgMemberWithUser).mockResolvedValue({
      externalId: 'user_other',
    });
    vi.mocked(deleteOrgMember).mockResolvedValue(undefined);
    const result = await removeMember(
      'mem_1',
      'org_1',
      'user_caller',
      orgAdmin
    );
    expect(result).toEqual({ removed: true });
    expect(orgAdmin.deleteMembership).toHaveBeenCalledWith({
      organizationId: 'org_1',
      clerkUserId: 'user_other',
    });
    expect(deleteOrgMember).toHaveBeenCalledWith('mem_1');
  });

  it('does not call Clerk when the caller removes themselves', async () => {
    const orgAdmin = createMockOrgAdmin();
    vi.mocked(fetchOrgMemberWithUser).mockResolvedValue({
      externalId: 'user_caller',
    });
    await expect(
      removeMember('mem_self', 'org_1', 'user_caller', orgAdmin)
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'SELF_REMOVAL_FORBIDDEN',
    });
    expect(orgAdmin.deleteMembership).not.toHaveBeenCalled();
    expect(deleteOrgMember).not.toHaveBeenCalled();
  });

  it('returns NotFoundError when the member is missing', async () => {
    const orgAdmin = createMockOrgAdmin();
    vi.mocked(fetchOrgMemberWithUser).mockResolvedValue(null);
    await expect(
      removeMember('mem_missing', 'org_1', 'user_caller', orgAdmin)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(orgAdmin.deleteMembership).not.toHaveBeenCalled();
  });
});
