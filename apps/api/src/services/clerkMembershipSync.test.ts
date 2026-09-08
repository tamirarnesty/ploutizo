import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClerkServerClient } from '../lib/clerkServerClient';
import { ensureCallerSyncedToOrg } from './clerkMembershipSync';
import {
  clerkBackendUserToLocalUserRow,
  findLocalUserIdByClerkId,
  insertOrgMemberIfAbsent,
  upsertLocalUser,
} from './clerkDbMirror';

vi.mock('./clerkDbMirror', () => ({
  clerkBackendUserToLocalUserRow: vi.fn(),
  findLocalUserIdByClerkId: vi.fn(),
  upsertLocalUser: vi.fn(),
  insertOrgMemberIfAbsent: vi.fn(),
}));

vi.mock('../lib/clerkServerClient', () => ({
  getClerkServerClient: vi.fn(),
}));

const localUserRow = {
  externalId: 'user_clerk_abc',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  imageUrl: null,
};

describe('ensureCallerSyncedToOrg', () => {
  const mockGetUser = vi.fn();
  const mockGetOrganizationMembershipList = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClerkServerClient).mockReturnValue({
      users: {
        getUser: mockGetUser,
        getOrganizationMembershipList: mockGetOrganizationMembershipList,
      },
    } as never);
    mockGetUser.mockResolvedValue({ id: 'user_clerk_abc' });
    vi.mocked(clerkBackendUserToLocalUserRow).mockReturnValue(localUserRow);
    vi.mocked(upsertLocalUser).mockResolvedValue(undefined);
    vi.mocked(findLocalUserIdByClerkId).mockResolvedValue('app_user_1');
    mockGetOrganizationMembershipList.mockResolvedValue({
      data: [
        {
          id: 'orgmem_1',
          organization: { id: 'org_household' },
          createdAt: 1_700_000_000_000,
          role: 'org:admin',
        },
      ],
      totalCount: 1,
    });
    vi.mocked(insertOrgMemberIfAbsent).mockResolvedValue(undefined);
  });

  it('upserts Clerk person fields for an existing local user', async () => {
    await ensureCallerSyncedToOrg('org_household', 'user_clerk_abc');

    expect(upsertLocalUser).toHaveBeenCalledWith(localUserRow, 'update');
    expect(insertOrgMemberIfAbsent).toHaveBeenCalledWith({
      orgId: 'org_household',
      appUserId: 'app_user_1',
      clerkMembershipId: 'orgmem_1',
      membershipCreatedAt: new Date(1_700_000_000_000),
      clerkOrgRole: 'org:admin',
    });
  });

  it('does nothing when clerk user id is missing', async () => {
    await ensureCallerSyncedToOrg('org_household', null);

    expect(getClerkServerClient).not.toHaveBeenCalled();
    expect(upsertLocalUser).not.toHaveBeenCalled();
  });
});
