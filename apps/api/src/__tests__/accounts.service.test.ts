import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OWNERS_REQUIRED_MESSAGE } from '@ploutizo/validators';
import { DomainError, NotFoundError } from '@/lib/errors';
import { allMembersInOrg } from '@/lib/queries/scope';
import {
  fetchAccountRecord,
  listAccountMemberDetails,
  listAccountMembers,
  updateAccount as updateAccountQuery,
} from '@/lib/queries/accounts';
import { createAccount, updateAccount } from '@/services/accounts';

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(
      async (
        fn: (tx: { insert: ReturnType<typeof vi.fn> }) => Promise<unknown>
      ) =>
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
  fetchAccountRecord: vi.fn().mockResolvedValue({
    id: 'acct_1',
    orgId: 'org_a',
    name: 'Shared',
    type: 'chequing',
    institutionId: 'td',
    statementDueDay: null,
  }),
  insertAccount: vi.fn().mockResolvedValue({
    id: 'acct_new',
    orgId: 'org_a',
    name: 'Shared',
    type: 'chequing',
    institutionId: 'td',
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }),
  insertAccountMembers: vi.fn(),
  listAccountMemberDetails: vi.fn().mockResolvedValue([]),
  listAccountMembers: vi
    .fn()
    .mockResolvedValue([
      { id: 'am_1', accountId: 'acct_1', memberId: 'mem_1' },
    ]),
  updateAccount: vi.fn(),
  replaceAccountMembers: vi.fn(),
}));

describe('accounts service — org-scoped member validation', () => {
  beforeEach(() => {
    vi.mocked(allMembersInOrg).mockReset();
    vi.mocked(listAccountMemberDetails).mockReset();
    vi.mocked(listAccountMemberDetails).mockResolvedValue([]);
    vi.mocked(listAccountMembers).mockResolvedValue([
      { id: 'am_1', accountId: 'acct_1', memberId: 'mem_1' },
    ]);
  });

  it('rejects create when memberIds include a member from another org', async () => {
    vi.mocked(allMembersInOrg).mockResolvedValue(false);

    const err = await createAccount('org_a', {
      name: 'Shared',
      type: 'chequing',
      institutionId: 'td',
      lastFour: undefined,
      memberIds: ['mem_other_org'],
      statementDueDay: null,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe(
      'Member not found in this household'
    );
  });

  it('returns owners from listAccountMemberDetails on create', async () => {
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(listAccountMemberDetails).mockResolvedValue([
      {
        accountId: 'acct_new',
        memberId: 'mem_1',
        displayName: 'Alice',
        imageUrl: 'https://img.clerk.com/alice.jpg',
      },
    ]);

    const account = await createAccount('org_a', {
      name: 'Shared',
      type: 'chequing',
      institutionId: 'td',
      lastFour: undefined,
      memberIds: ['mem_1'],
      statementDueDay: null,
    });

    expect(listAccountMemberDetails).toHaveBeenCalledWith(
      'org_a',
      ['acct_new'],
      expect.anything()
    );
    expect(account.owners).toEqual([
      {
        id: 'mem_1',
        displayName: 'Alice',
        imageUrl: 'https://img.clerk.com/alice.jpg',
      },
    ]);
  });

  it('rolls back create when owner lookup fails inside the transaction', async () => {
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(listAccountMemberDetails).mockRejectedValue(
      new Error('owner lookup failed')
    );

    await expect(
      createAccount('org_a', {
        name: 'Shared',
        type: 'chequing',
        institutionId: 'td',
        lastFour: undefined,
        memberIds: ['mem_1'],
        statementDueDay: null,
      })
    ).rejects.toThrow('owner lookup failed');
  });

  it('rejects update when memberIds include a member from another org', async () => {
    vi.mocked(allMembersInOrg).mockResolvedValue(false);

    const err = await updateAccount('org_a', 'acct_1', {
      memberIds: ['mem_other_org'],
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
  });

  it('rejects update when the account currently has zero owners', async () => {
    vi.mocked(listAccountMembers).mockResolvedValue([]);

    const err = await updateAccount('org_a', 'acct_1', {
      name: 'Renamed',
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toBe(OWNERS_REQUIRED_MESSAGE);
    expect(updateAccountQuery).not.toHaveBeenCalled();
  });

  it('persists statementDueDay null when changing a card to a non-card type', async () => {
    vi.mocked(fetchAccountRecord).mockResolvedValue({
      id: 'acct_1',
      orgId: 'org_a',
      name: 'Visa',
      type: 'credit_card',
      institutionId: 'td',
      lastFour: null,
      statementDueDay: 15,
      archivedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    vi.mocked(updateAccountQuery).mockResolvedValue({
      id: 'acct_1',
      orgId: 'org_a',
      name: 'Visa',
      type: 'chequing',
      institutionId: 'td',
      lastFour: null,
      statementDueDay: null,
      archivedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });

    await updateAccount('org_a', 'acct_1', {
      type: 'chequing',
      institutionId: 'td',
    });

    expect(updateAccountQuery).toHaveBeenCalledWith(
      expect.anything(),
      'org_a',
      'acct_1',
      expect.objectContaining({
        type: 'chequing',
        statementDueDay: null,
      })
    );
  });

  it('returns owners from listAccountMemberDetails on update', async () => {
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(updateAccountQuery).mockResolvedValue({
      id: 'acct_1',
      orgId: 'org_a',
      name: 'Shared',
      type: 'chequing',
      institutionId: 'td',
      lastFour: null,
      statementDueDay: null,
      archivedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    vi.mocked(listAccountMemberDetails).mockResolvedValue([
      {
        accountId: 'acct_1',
        memberId: 'mem_1',
        displayName: 'Alice',
        imageUrl: null,
      },
    ]);

    const account = await updateAccount('org_a', 'acct_1', {
      memberIds: ['mem_1'],
    });

    expect(listAccountMemberDetails).toHaveBeenCalledWith(
      'org_a',
      ['acct_1'],
      expect.anything()
    );
    expect(account.owners).toEqual([
      {
        id: 'mem_1',
        displayName: 'Alice',
        imageUrl: null,
      },
    ]);
  });
});
