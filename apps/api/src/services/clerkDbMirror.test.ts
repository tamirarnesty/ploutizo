import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteOrgMemberIfPresent } from './clerkDbMirror';

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

describe('deleteOrgMemberIfPresent', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockDelete.mockReset();
  });

  it('deletes org_members when the local user exists', async () => {
    const selectChain = chainSelect([{ id: 'app_user_1' }]);
    const deleteChain = chainDelete();

    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_clerk_1',
    });

    expect(selectChain.from).toHaveBeenCalled();
    expect(deleteChain.where).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it('is a no-op when the local user row is missing', async () => {
    chainSelect([]);

    await deleteOrgMemberIfPresent({
      orgId: 'org_1',
      clerkUserId: 'user_missing',
    });

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('is a no-op when the membership row was already removed', async () => {
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
