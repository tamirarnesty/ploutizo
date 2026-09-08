import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteOrgMemberByClerkMembershipId,
  deleteOrgMemberIfPresent,
} from './clerkDbMirror';
import { listOrgMembers } from '@/lib/queries/households';

type SeedUser = {
  id: string;
  externalId: string;
  imageUrl: string | null;
  firstName: string | null;
  lastName: string | null;
};

type SeedMember = {
  id: string;
  orgId: string;
  userId: string;
  externalId: string;
  displayName: string;
  role: 'admin' | 'member';
  joinedAt: Date;
};

const membershipDb = vi.hoisted(() => {
  const orgMembers = {
    orgId: 'orgId',
    userId: 'userId',
    externalId: 'externalId',
  };
  const users = { id: 'id', externalId: 'externalId' };

  const state: { users: SeedUser[]; members: SeedMember[] } = {
    users: [
      {
        id: 'app_user_caller',
        externalId: 'user_caller',
        imageUrl: null,
        firstName: 'Caller',
        lastName: null,
      },
      {
        id: 'app_user_other',
        externalId: 'user_other',
        imageUrl: null,
        firstName: 'Other',
        lastName: null,
      },
    ],
    members: [
      {
        id: 'mem_1',
        orgId: 'org_1',
        userId: 'app_user_caller',
        externalId: 'orgmem_caller',
        displayName: 'Caller',
        role: 'admin',
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'mem_2',
        orgId: 'org_1',
        userId: 'app_user_other',
        externalId: 'orgmem_other_current',
        displayName: 'Other',
        role: 'member',
        joinedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ],
  };

  const mockSelect = vi.fn();
  const mockDelete = vi.fn();

  const listMembersForOrg = (orgId: string) =>
    state.members
      .filter((member) => member.orgId === orgId)
      .map((member) => {
        const user = state.users.find((row) => row.id === member.userId);
        if (!user) {
          throw new Error(`Missing user for member ${member.id}`);
        }
        return {
          id: member.id,
          orgId: member.orgId,
          displayName: member.displayName,
          role: member.role,
          joinedAt: member.joinedAt,
          externalId: user.externalId,
          imageUrl: user.imageUrl,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const chainMemberList = (orgId: string) => {
    const orderBy = vi.fn().mockResolvedValue(listMembersForOrg(orgId));
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    mockSelect.mockReturnValueOnce({ from });
  };

  const chainUserLookup = (clerkUserId: string) => {
    const limit = vi
      .fn()
      .mockResolvedValue(
        state.users
          .filter((user) => user.externalId === clerkUserId)
          .map((user) => ({ id: user.id }))
      );
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    mockSelect.mockReturnValueOnce({ from });
  };

  const chainDeleteByMembership = (params: {
    orgId: string;
    appUserId: string;
    clerkMembershipId: string;
  }) => {
    const where = vi.fn().mockImplementation(() => {
      state.members = state.members.filter(
        (member) =>
          !(
            member.orgId === params.orgId &&
            member.userId === params.appUserId &&
            member.externalId === params.clerkMembershipId
          )
      );
      return Promise.resolve(undefined);
    });
    mockDelete.mockReturnValueOnce({ where });
  };

  return {
    db: {
      select: (...args: unknown[]) => mockSelect(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    state,
    schema: { orgMembers, users },
    chainMemberList,
    chainUserLookup,
    chainDeleteByMembership,
  };
});

vi.mock('@ploutizo/db', () => ({
  db: membershipDb.db,
}));

vi.mock('@ploutizo/db/schema', () => ({
  orgMembers: membershipDb.schema.orgMembers,
  users: membershipDb.schema.users,
  orgs: {},
}));

const resetMembers = () => {
  membershipDb.state.members = [
    {
      id: 'mem_1',
      orgId: 'org_1',
      userId: 'app_user_caller',
      externalId: 'orgmem_caller',
      displayName: 'Caller',
      role: 'admin',
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    {
      id: 'mem_2',
      orgId: 'org_1',
      userId: 'app_user_other',
      externalId: 'orgmem_other_current',
      displayName: 'Other',
      role: 'member',
      joinedAt: new Date('2026-01-02T00:00:00.000Z'),
    },
  ];
};

describe('member removal visibility', () => {
  beforeEach(() => {
    resetMembers();
    vi.clearAllMocks();
  });

  it('removes the deleted member from listOrgMembers results', async () => {
    membershipDb.chainMemberList('org_1');
    const before = await listOrgMembers('org_1');

    membershipDb.chainDeleteByMembership({
      orgId: 'org_1',
      appUserId: 'app_user_other',
      clerkMembershipId: 'orgmem_other_current',
    });
    await deleteOrgMemberByClerkMembershipId({
      orgId: 'org_1',
      appUserId: 'app_user_other',
      clerkMembershipId: 'orgmem_other_current',
    });

    membershipDb.chainMemberList('org_1');
    const after = await listOrgMembers('org_1');

    expect(before.map((member) => member.externalId)).toEqual([
      'user_caller',
      'user_other',
    ]);
    expect(after.map((member) => member.externalId)).toEqual(['user_caller']);
  });

  it('ignores stale delete webhooks after a member rejoins with a new Clerk membership id', async () => {
    membershipDb.chainUserLookup('user_other');
    membershipDb.chainDeleteByMembership({
      orgId: 'org_1',
      appUserId: 'app_user_other',
      clerkMembershipId: 'orgmem_other_stale',
    });
    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_other',
      clerkMembershipId: 'orgmem_other_stale',
    });

    membershipDb.chainMemberList('org_1');
    const members = await listOrgMembers('org_1');

    expect(members.map((member) => member.externalId)).toEqual([
      'user_caller',
      'user_other',
    ]);
  });
});
