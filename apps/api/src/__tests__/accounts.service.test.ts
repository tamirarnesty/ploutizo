import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/lib/errors';
import { allMembersInOrg } from '@/lib/queries/scope';
import {
  fetchAccountRecord,
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
      institutionId: 'td',
      memberIds: ['mem_other_org'],
      statementDueDay: null,
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
});
