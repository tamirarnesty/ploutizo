import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteOrgMemberByOrgAndAppUserId,
  deleteOrgMemberIfPresent,
} from './clerkDbMirror';
import { handleOrgMembershipDeleted } from './webhooks';
import type { ClerkOrgAdminPort } from '@/lib/clerkOrgAdmin';
import type { OrganizationMembershipJSON } from '@clerk/backend';
import {
  deleteOrgMember,
  fetchOrgMemberWithUser,
  listOrgMembers,
} from '@/lib/queries/households';
import { removeMember } from '@/services/households';

vi.mock('@/lib/queries/households', () => ({
  deleteOrgMember: vi.fn(),
  fetchOrgMemberWithUser: vi.fn(),
  listOrgMembers: vi.fn(),
}));

vi.mock('./clerkDbMirror', () => ({
  deleteOrgMemberByOrgAndAppUserId: vi.fn(),
  deleteOrgMemberIfPresent: vi.fn(),
}));

const createMockOrgAdmin = (): ClerkOrgAdminPort => ({
  createInvitation: vi.fn(),
  listInvitations: vi.fn(),
  revokeInvitation: vi.fn(),
  deleteMembership: vi.fn().mockResolvedValue(undefined),
});

const membershipDeletedPayload = (): OrganizationMembershipJSON =>
  ({
    organization: { id: 'org_1' },
    public_user_data: { user_id: 'user_other' },
  }) as OrganizationMembershipJSON;

describe('member removal paths', () => {
  beforeEach(() => {
    vi.mocked(fetchOrgMemberWithUser).mockReset();
    vi.mocked(deleteOrgMember).mockReset();
    vi.mocked(listOrgMembers).mockReset();
    vi.mocked(deleteOrgMemberByOrgAndAppUserId).mockReset();
    vi.mocked(deleteOrgMemberIfPresent).mockReset();
    vi.mocked(deleteOrgMemberIfPresent).mockResolvedValue(undefined);
  });

  it('in-app remove followed by webhook delete completes without error', async () => {
    const orgAdmin = createMockOrgAdmin();
    vi.mocked(fetchOrgMemberWithUser).mockResolvedValue({
      externalId: 'user_other',
    });
    vi.mocked(deleteOrgMember).mockResolvedValue(undefined);

    await removeMember('mem_1', 'org_1', 'user_caller', orgAdmin);
    await expect(
      handleOrgMembershipDeleted(membershipDeletedPayload())
    ).resolves.toBeUndefined();

    expect(deleteOrgMember).toHaveBeenCalledWith('mem_1');
    expect(deleteOrgMemberIfPresent).toHaveBeenCalledWith({
      orgId: 'org_1',
      clerkUserId: 'user_other',
    });
  });

  it('models settings visibility after org+user delete', async () => {
    const remainingMember = {
      id: 'mem_1',
      orgId: 'org_1',
      displayName: 'Caller',
      role: 'admin' as const,
      joinedAt: new Date(),
      externalId: 'user_caller',
      imageUrl: null,
      firstName: 'Caller',
      lastName: null,
    };
    const removedMember = {
      ...remainingMember,
      id: 'mem_2',
      displayName: 'Other',
      role: 'member' as const,
      externalId: 'user_other',
      firstName: 'Other',
    };

    vi.mocked(listOrgMembers)
      .mockResolvedValueOnce([remainingMember, removedMember] as Awaited<
        ReturnType<typeof listOrgMembers>
      >)
      .mockResolvedValueOnce([remainingMember]);

    const before = await listOrgMembers('org_1');
    await deleteOrgMemberByOrgAndAppUserId({
      orgId: 'org_1',
      appUserId: 'app_user_other',
    });
    const after = await listOrgMembers('org_1');

    expect(before.map((m) => m.externalId)).toEqual([
      'user_caller',
      'user_other',
    ]);
    expect(after.map((m) => m.externalId)).toEqual(['user_caller']);
    expect(deleteOrgMemberByOrgAndAppUserId).toHaveBeenCalledWith({
      orgId: 'org_1',
      appUserId: 'app_user_other',
    });
  });
});
