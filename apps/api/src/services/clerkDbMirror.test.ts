import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteOrgMemberIfPresent,
  findLocalUserIdByClerkId,
  insertOrgMemberIfAbsent,
} from './clerkDbMirror';

const shouldApplyMembershipUpdate = (
  storedCreatedAt: Date,
  incomingCreatedAt: Date | undefined
) =>
  incomingCreatedAt !== undefined &&
  storedCreatedAt.getTime() < incomingCreatedAt.getTime();

type MirrorMember = {
  orgId: string;
  userId: string;
  externalId: string;
  membershipCreatedAt: Date;
  role: string;
};

const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const membershipRows: MirrorMember[] = [];
let lastConflictConfig: { setWhere?: unknown } | undefined;

vi.mock('@ploutizo/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock('@ploutizo/db/schema', () => ({
  orgMembers: {
    orgId: 'orgId',
    userId: 'userId',
    externalId: 'externalId',
    membershipCreatedAt: 'membershipCreatedAt',
  },
  users: { id: 'id', externalId: 'externalId' },
}));

const chainSelect = (rows: unknown[]) => {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mockSelect.mockReturnValue({ from });
  return { limit, where, from };
};

const chainDelete = () => {
  const where = vi.fn().mockResolvedValue(undefined);
  mockDelete.mockReturnValue({ where });
  return { where };
};

const chainInsert = () => {
  mockInsert.mockImplementation(() => ({
    values: (row: MirrorMember) => ({
      onConflictDoUpdate: (config: {
        set: Partial<MirrorMember>;
        setWhere?: unknown;
      }) => {
        lastConflictConfig = config;
        const existing = membershipRows.find(
          (member) => member.orgId === row.orgId && member.userId === row.userId
        );
        if (!existing) {
          membershipRows.push({ ...row });
          return Promise.resolve();
        }
        if (
          config.setWhere &&
          !shouldApplyMembershipUpdate(
            existing.membershipCreatedAt,
            config.set.membershipCreatedAt as Date
          )
        ) {
          return Promise.resolve();
        }
        Object.assign(existing, config.set);
        return Promise.resolve();
      },
    }),
  }));
};

const insertMembership = (params: {
  clerkMembershipId: string;
  membershipCreatedAt: Date;
}) =>
  insertOrgMemberIfAbsent({
    orgId: 'org_1',
    appUserId: 'app_user_1',
    clerkMembershipId: params.clerkMembershipId,
    membershipCreatedAt: params.membershipCreatedAt,
    clerkOrgRole: 'org:admin',
  });

const oldCreatedAt = new Date('2026-01-01T00:00:00.000Z');
const newCreatedAt = new Date('2026-02-01T00:00:00.000Z');

describe('findLocalUserIdByClerkId', () => {
  beforeEach(() => {
    mockSelect.mockReset();
  });

  it('returns the local user id when a mirror row exists', async () => {
    chainSelect([{ id: 'app_user_1' }]);
    await expect(findLocalUserIdByClerkId('user_clerk_1')).resolves.toBe(
      'app_user_1'
    );
  });

  it('returns undefined when the local user row is missing', async () => {
    chainSelect([]);
    await expect(
      findLocalUserIdByClerkId('user_missing')
    ).resolves.toBeUndefined();
  });
});

describe('deleteOrgMemberIfPresent', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockDelete.mockReset();
  });

  it('deletes org_members when the local user exists', async () => {
    chainSelect([{ id: 'app_user_1' }]);
    const deleteChain = chainDelete();

    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_clerk_1',
      clerkMembershipId: 'orgmem_1',
    });

    expect(deleteChain.where).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it('skips delete when the local user row is missing', async () => {
    chainSelect([]);

    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_missing',
      clerkMembershipId: 'orgmem_1',
    });

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('is safe to call again when the membership row is already gone', async () => {
    chainSelect([{ id: 'app_user_1' }]);
    chainDelete();

    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_clerk_1',
      clerkMembershipId: 'orgmem_1',
    });
    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_clerk_1',
      clerkMembershipId: 'orgmem_1',
    });

    expect(mockDelete).toHaveBeenCalledTimes(2);
  });
});

describe('insertOrgMemberIfAbsent', () => {
  beforeEach(() => {
    membershipRows.length = 0;
    lastConflictConfig = undefined;
    mockInsert.mockReset();
    chainInsert();
  });

  it('stores Clerk membership identity and created_at on insert', async () => {
    await insertMembership({
      clerkMembershipId: 'orgmem_new',
      membershipCreatedAt: newCreatedAt,
    });

    expect(membershipRows).toEqual([
      {
        orgId: 'org_1',
        userId: 'app_user_1',
        externalId: 'orgmem_new',
        membershipCreatedAt: newCreatedAt,
        role: 'admin',
      },
    ]);
    expect(lastConflictConfig?.setWhere).toBeDefined();
  });

  it('replaces an older membership identity with a newer create', async () => {
    await insertMembership({
      clerkMembershipId: 'orgmem_old',
      membershipCreatedAt: oldCreatedAt,
    });
    await insertMembership({
      clerkMembershipId: 'orgmem_new',
      membershipCreatedAt: newCreatedAt,
    });

    expect(membershipRows[0]?.externalId).toBe('orgmem_new');
    expect(membershipRows[0]?.membershipCreatedAt).toEqual(newCreatedAt);
  });

  it('keeps the current membership identity when a delayed older create arrives', async () => {
    await insertMembership({
      clerkMembershipId: 'orgmem_new',
      membershipCreatedAt: newCreatedAt,
    });
    await insertMembership({
      clerkMembershipId: 'orgmem_old',
      membershipCreatedAt: oldCreatedAt,
    });

    expect(membershipRows[0]?.externalId).toBe('orgmem_new');
    expect(membershipRows[0]?.membershipCreatedAt).toEqual(newCreatedAt);
  });

  it('treats a duplicate create for the same membership as a no-op', async () => {
    await insertMembership({
      clerkMembershipId: 'orgmem_new',
      membershipCreatedAt: newCreatedAt,
    });
    await insertMembership({
      clerkMembershipId: 'orgmem_new',
      membershipCreatedAt: newCreatedAt,
    });

    expect(membershipRows).toHaveLength(1);
    expect(membershipRows[0]?.externalId).toBe('orgmem_new');
  });
});
