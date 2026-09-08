import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteOrgMemberByOrgAndAppUserId,
  deleteOrgMemberIfPresent,
  findLocalUserIdByClerkId,
} from './clerkDbMirror';

const mockDelete = vi.fn();
const mockSelect = vi.fn();

vi.mock('@ploutizo/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('@ploutizo/db/schema', () => ({
  orgMembers: { orgId: 'orgId', userId: 'userId' },
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

describe('deleteOrgMemberByOrgAndAppUserId', () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it('issues a hard delete for the org and app user', async () => {
    const deleteChain = chainDelete();
    await deleteOrgMemberByOrgAndAppUserId({
      orgId: 'org_1',
      appUserId: 'app_user_1',
    });
    expect(deleteChain.where).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
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
    });

    expect(deleteChain.where).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it('skips delete when the local user row is missing', async () => {
    chainSelect([]);

    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_missing',
    });

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('is safe to call again when the membership row is already gone', async () => {
    chainSelect([{ id: 'app_user_1' }]);
    chainDelete();

    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_clerk_1',
    });
    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_clerk_1',
    });

    expect(mockDelete).toHaveBeenCalledTimes(2);
  });
});
