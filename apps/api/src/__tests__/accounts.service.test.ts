import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/lib/errors';
import { allMembersInOrg } from '@/lib/queries/scope';
import { createAccount, updateAccount } from '@/services/accounts';

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(
      async (fn: (tx: { insert: ReturnType<typeof vi.fn> }) => Promise<unknown>) =>
        fn({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'acct_new',
                  orgId: 'org_a',
                  name: 'Shared',
                  type: 'chequing',
                },
              ]),
            }),
          }),
        })
    ),
  },
}));

vi.mock('@/lib/queries/scope', () => ({
  allMembersInOrg: vi.fn(),
}));

vi.mock('@/lib/queries/accounts', () => ({
  insertAccount: vi.fn().mockResolvedValue({
    id: 'acct_new',
    orgId: 'org_a',
    name: 'Shared',
    type: 'chequing',
  }),
  insertAccountMembers: vi.fn(),
  updateAccount: vi.fn(),
  replaceAccountMembers: vi.fn(),
}));

describe('accounts service — org-scoped member validation', () => {
  beforeEach(() => {
    vi.mocked(allMembersInOrg).mockReset();
  });

  it('rejects create when memberIds include a member from another org', async () => {
    vi.mocked(allMembersInOrg).mockResolvedValue(false);

    const err = await createAccount('org_a', {
      name: 'Shared',
      type: 'chequing',
      memberIds: ['mem_other_org'],
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe(
      'Member not found in this household'
    );
  });

  it('rejects update when memberIds include a member from another org', async () => {
    vi.mocked(allMembersInOrg).mockResolvedValue(false);

    const err = await updateAccount('org_a', 'acct_1', {
      memberIds: ['mem_other_org'],
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
  });
});
