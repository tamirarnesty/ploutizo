import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteOrgMemberIfPresent } from './clerkDbMirror';
import { handleOrgMembershipDeleted } from './webhooks';
import type { ClerkOrgAdminPort } from '@/lib/clerkOrgAdmin';
import type { OrganizationMembershipJSON } from '@clerk/backend';
import {
  deleteOrgMember,
  fetchOrgMemberWithUser,
} from '@/lib/queries/households';
import { removeMember } from '@/services/households';

vi.mock('@/lib/queries/households', () => ({
  deleteOrgMember: vi.fn(),
  fetchOrgMemberWithUser: vi.fn(),
  listOrgMembers: vi.fn(),
}));

vi.mock('./clerkDbMirror', () => ({
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
    id: 'orgmem_other_stale',
    organization: { id: 'org_1' },
    public_user_data: { user_id: 'user_other' },
  }) as OrganizationMembershipJSON;

describe('member removal paths', () => {
  beforeEach(() => {
    vi.mocked(fetchOrgMemberWithUser).mockReset();
    vi.mocked(deleteOrgMember).mockReset();
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
      clerkMembershipId: 'orgmem_other_stale',
    });
  });
});
