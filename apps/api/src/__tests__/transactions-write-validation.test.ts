import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/lib/errors';
import {
  accountExistsInOrg,
  allMembersInOrg,
  allTagsInOrg,
} from '@/lib/queries/scope';
import { createTransaction } from '@/services/transactions';

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(
      async (fn: (tx: { insert: ReturnType<typeof vi.fn> }) => Promise<unknown>) =>
        fn({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'tx_1' }]),
            }),
          }),
        })
    ),
  },
}));

vi.mock('@/lib/queries/scope', () => ({
  accountExistsInOrg: vi.fn(),
  allMembersInOrg: vi.fn(),
  allTagsInOrg: vi.fn(),
  categoryExistsInOrg: vi.fn(),
  transactionExistsInOrg: vi.fn(),
}));

const ORG_A = 'org_a';
const ACCOUNT_A = '550e8400-e29b-41d4-a716-446655440010';

describe('createTransaction — cross-org reference rejection', () => {
  beforeEach(() => {
    vi.mocked(accountExistsInOrg).mockReset();
    vi.mocked(allMembersInOrg).mockReset();
    vi.mocked(allTagsInOrg).mockReset();
    vi.mocked(accountExistsInOrg).mockResolvedValue(true);
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(allTagsInOrg).mockResolvedValue(true);
  });

  it('rejects primary accountId not in org (two-org isolation)', async () => {
    vi.mocked(accountExistsInOrg).mockResolvedValue(false);

    const err = await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Test',
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Account not found');
    expect(accountExistsInOrg).toHaveBeenCalledWith(ORG_A, ACCOUNT_A);
  });

  it('rejects assignee memberId not in org', async () => {
    vi.mocked(allMembersInOrg).mockResolvedValue(false);

    const err = await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Test',
      assignees: [{ memberId: 'mem_org_b', amountCents: 1000 }],
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe(
      'Member not found in this household'
    );
  });
});
