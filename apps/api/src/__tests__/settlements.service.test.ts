import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SettlementBalanceRow } from '@/lib/queries/settlements';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  fetchAccountForSettlement,
  fetchSettlementBalances,
  fetchSharedParticipantIds,
  memberBelongsToOrg,
} from '@/lib/queries/settlements';
import { listAccountMemberDetails } from '@/lib/queries/accounts';
import {
  createSettlement,
  getSettlementBalances,
} from '@/services/settlements';
import { createTransaction } from '@/services/transactions';

vi.mock('@/lib/queries/settlements', () => ({
  fetchSettlementBalances: vi.fn(),
  fetchAccountForSettlement: vi.fn(),
  fetchSharedParticipantIds: vi.fn(),
  memberBelongsToOrg: vi.fn(),
}));

vi.mock('@/lib/queries/accounts', () => ({
  listAccountMemberDetails: vi.fn(),
}));

vi.mock('@/services/transactions', () => ({
  createTransaction: vi.fn(),
}));

const cardAccountId = '550e8400-e29b-41d4-a716-446655440002';
const counterpartAccountId = '550e8400-e29b-41d4-a716-446655440003';

const mockSettlementAccountLookups = (options: {
  card?: { name: string; archivedAt?: Date | null; type?: 'credit_card' | 'chequing' } | null;
  counterpart?: { name: string } | null;
}) => {
  vi.mocked(fetchAccountForSettlement).mockImplementation((_orgId, accountId) => {
    if (accountId === cardAccountId) {
      if (options.card === null) return Promise.resolve(null);
      return Promise.resolve({
        id: cardAccountId,
        name: options.card?.name ?? 'Amex Gold',
        type: options.card?.type ?? 'credit_card',
        archivedAt: options.card?.archivedAt ?? null,
      });
    }
    if (accountId === counterpartAccountId) {
      if (options.counterpart === null) return Promise.resolve(null);
      return Promise.resolve({
        id: counterpartAccountId,
        name: options.counterpart?.name ?? 'RBC Chequing',
        type: 'chequing' as const,
        archivedAt: null,
      });
    }
    return Promise.resolve(null);
  });
};

const baseRow: SettlementBalanceRow = {
  accountId: 'a1',
  accountName: 'Amex',
  accountType: 'credit_card',
  institution: null,
  lastFour: null,
  statementDueDay: null,
  memberId: 'm1',
  memberName: 'Alice',
  memberAvatarUrl: null,
  personalBalanceCents: 0,
  sharedBalanceCents: 0,
  sharedParticipantIds: [],
};

describe('getSettlementBalances service', () => {
  beforeEach(() => {
    vi.mocked(fetchSettlementBalances).mockReset();
    vi.mocked(listAccountMemberDetails).mockReset();
    vi.mocked(listAccountMemberDetails).mockResolvedValue([]);
  });

  it('GET-SETTLE-04: omits non-credit accounts where all balances are zero (D-08)', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      {
        ...baseRow,
        accountType: 'chequing',
        memberId: 'm1',
        memberName: 'Alice',
        personalBalanceCents: 0,
        sharedBalanceCents: 0,
      },
      {
        ...baseRow,
        accountType: 'chequing',
        memberId: 'm2',
        memberName: 'Bob',
        personalBalanceCents: 0,
        sharedBalanceCents: 0,
      },
    ]);
    const r = await getSettlementBalances('org_test123');
    expect(r.accounts).toHaveLength(0);
  });

  it('GET-SETTLE-04b: includes credit_card when all balances are zero', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      {
        ...baseRow,
        accountType: 'credit_card',
        memberId: 'm1',
        memberName: 'Alice',
        personalBalanceCents: 0,
        sharedBalanceCents: 0,
      },
      {
        ...baseRow,
        accountType: 'credit_card',
        memberId: 'm2',
        memberName: 'Bob',
        personalBalanceCents: 0,
        sharedBalanceCents: 0,
      },
    ]);
    const r = await getSettlementBalances('org_test123');
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0]?.account.type).toBe('credit_card');
    expect(r.accounts[0]?.totalBalanceCents).toBe(0);
    expect(r.accounts[0]?.sharedBalanceCents).toBe(0);
  });

  it('GET-SETTLE-05: statementDueDay null => dueDate: null, status: null', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, statementDueDay: null, personalBalanceCents: 5000 },
    ]);
    const r = await getSettlementBalances('org_test123');
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0].dueDate).toBeNull();
    expect(r.accounts[0].status).toBeNull();
  });

  it('GET-SETTLE-06: statementDueDay set, today 5 days before => due_soon', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, statementDueDay: 20, personalBalanceCents: 5000 },
    ]);
    const now = new Date('2026-05-15T00:00:00Z');
    const r = await getSettlementBalances('org_test123', now);
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0].dueDate).toBe('2026-05-20');
    expect(r.accounts[0].status).toBe('due_soon');
  });

  it('GET-SETTLE-07: totalBalanceCents = Σ personal + shared (identity)', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      {
        ...baseRow,
        memberId: 'm1',
        memberName: 'Alice',
        personalBalanceCents: 5000,
        sharedBalanceCents: 3000,
        sharedParticipantIds: ['m1', 'm2'],
      },
      {
        ...baseRow,
        memberId: 'm2',
        memberName: 'Bob',
        personalBalanceCents: -1000,
        sharedBalanceCents: 3000,
        sharedParticipantIds: ['m1', 'm2'],
      },
    ]);
    const r = await getSettlementBalances('org_test123');
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0].totalBalanceCents).toBe(7000);
    expect(r.accounts[0].sharedBalanceCents).toBe(3000);
    expect(r.accounts[0].sharedParticipantIds).toEqual(['m1', 'm2']);
    expect(r.accounts[0].members).toHaveLength(2);
    expect(r.accounts[0].members[0]?.personalBalanceCents).toBe(5000);
  });

  it('GET-SETTLE-08: attaches account owners from listAccountMemberDetails', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, personalBalanceCents: 100 },
    ]);
    vi.mocked(listAccountMemberDetails).mockResolvedValueOnce([
      {
        accountId: 'a1',
        memberId: 'm1',
        displayName: 'Alice',
        imageUrl: 'https://example.com/a.jpg',
      },
      {
        accountId: 'a1',
        memberId: 'm2',
        displayName: 'Bob',
        imageUrl: null,
      },
    ]);
    const r = await getSettlementBalances('org_test123');
    expect(listAccountMemberDetails).toHaveBeenCalledWith('org_test123', ['a1']);
    expect(r.accounts[0]?.account.owners).toEqual([
      { id: 'm1', displayName: 'Alice', imageUrl: 'https://example.com/a.jpg' },
      { id: 'm2', displayName: 'Bob', imageUrl: null },
    ]);
  });
});

describe('createSettlement service', () => {
  const memberA = '550e8400-e29b-41d4-a716-446655440001';
  const memberB = '550e8400-e29b-41d4-a716-446655440004';
  const validInput = {
    assignees: [{ memberId: memberA }],
    accountId: cardAccountId,
    counterpartAccountId,
    amountCents: 5000,
    date: '2026-05-08',
  };

  beforeEach(() => {
    vi.mocked(fetchAccountForSettlement).mockReset();
    vi.mocked(memberBelongsToOrg).mockReset();
    vi.mocked(fetchSharedParticipantIds).mockReset();
    vi.mocked(createTransaction).mockReset();
  });

  it('POST-SETTLE-05b: non-credit-card target => DomainError 400', async () => {
    mockSettlementAccountLookups({
      card: { name: 'Chequing', type: 'chequing' },
      counterpart: { name: 'RBC Chequing' },
    });
    vi.mocked(memberBelongsToOrg).mockResolvedValue(true);

    const err = await createSettlement('org_1', validInput).catch(
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).statusCode).toBe(400);
    expect((err as DomainError).message).toBe(
      'Settlement can only be recorded against a credit card account'
    );
  });

  it('POST-SETTLE-06: account not found => throws NotFoundError("Account not found")', async () => {
    mockSettlementAccountLookups({ card: null });

    const err = await createSettlement('org_1', validInput).catch(
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Account not found');
  });

  it('POST-SETTLE-07: account archived => throws DomainError(400, "Cannot settle an archived account")', async () => {
    mockSettlementAccountLookups({
      card: { name: 'Amex Gold', archivedAt: new Date('2026-01-01') },
    });

    const err = await createSettlement('org_1', validInput).catch(
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toBe(
      'Cannot settle an archived account'
    );
    expect((err as DomainError).statusCode).toBe(400);
  });

  it('POST-SETTLE-08: member not in org => throws NotFoundError("Member not found in this household")', async () => {
    mockSettlementAccountLookups({ card: { name: 'Amex Gold' } });
    vi.mocked(memberBelongsToOrg).mockResolvedValue(false);

    const err = await createSettlement('org_1', validInput).catch(
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe(
      'Member not found in this household'
    );
  });

  it('POST-SETTLE-09: happy path — single assignee invokes createTransaction', async () => {
    const mockInserted = { id: 'tx_1', type: 'settlement', amount: 5000 };
    mockSettlementAccountLookups({
      card: { name: 'Amex Gold' },
      counterpart: { name: 'RBC Chequing' },
    });
    vi.mocked(memberBelongsToOrg).mockResolvedValue(true);
    vi.mocked(createTransaction).mockResolvedValue(mockInserted as never);

    const result = await createSettlement('org_1', validInput);

    expect(createTransaction).toHaveBeenCalledOnce();
    const callArg = vi.mocked(createTransaction).mock.calls[0][1];
    expect(callArg.type).toBe('settlement');
    expect(
      (callArg as { counterpartAccountId?: string }).counterpartAccountId
    ).toBe(validInput.counterpartAccountId);
    expect(callArg.description).toBe(
      'Settlement from RBC Chequing to Amex Gold'
    );
    expect(callArg.assignees).toHaveLength(1);
    expect(callArg.assignees[0].amountCents).toBe(validInput.amountCents);
    expect(result).toEqual(mockInserted);
  });

  it('POST-SETTLE-09b: multi-assignee applies LRM split summing to amount', async () => {
    mockSettlementAccountLookups({ card: { name: 'Amex Gold' } });
    vi.mocked(memberBelongsToOrg).mockResolvedValue(true);
    vi.mocked(fetchSharedParticipantIds).mockResolvedValue([memberA, memberB]);
    vi.mocked(createTransaction).mockResolvedValue({ id: 'tx_2' } as never);

    await createSettlement('org_1', {
      ...validInput,
      amountCents: 10_000,
      assignees: [{ memberId: memberA }, { memberId: memberB }],
    });

    const callArg = vi.mocked(createTransaction).mock.calls[0][1];
    expect(callArg.assignees).toHaveLength(2);
    const sum = callArg.assignees.reduce(
      (acc, row) => acc + row.amountCents,
      0
    );
    expect(sum).toBe(10_000);
  });

  it('POST-SETTLE-09c: wrong shared assignee set => DomainError 400', async () => {
    mockSettlementAccountLookups({ card: { name: 'Amex Gold' } });
    vi.mocked(memberBelongsToOrg).mockResolvedValue(true);
    vi.mocked(fetchSharedParticipantIds).mockResolvedValue([memberA, memberB]);

    const err = await createSettlement('org_1', {
      ...validInput,
      assignees: [
        { memberId: memberA },
        { memberId: '550e8400-e29b-41d4-a716-446655440099' },
      ],
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).statusCode).toBe(400);
  });

  it('POST-SETTLE-10: counterpart account not in org => throws NotFoundError', async () => {
    mockSettlementAccountLookups({
      card: { name: 'Amex Gold' },
      counterpart: null,
    });
    vi.mocked(memberBelongsToOrg).mockResolvedValue(true);

    const err = await createSettlement('org_1', validInput).catch(
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Paid-from account not found');
  });

  it('POST-SETTLE-11: identical account and counterpart => throws DomainError(400)', async () => {
    mockSettlementAccountLookups({ card: { name: 'Amex Gold' } });
    vi.mocked(memberBelongsToOrg).mockResolvedValue(true);

    const err = await createSettlement('org_1', {
      ...validInput,
      counterpartAccountId: validInput.accountId,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).statusCode).toBe(400);
    expect((err as DomainError).message).toBe(
      'Paid-from account must differ from the card being settled'
    );
  });
});

describe('createSettlement — notes forwarding (Phase 4.2 extension)', () => {
  beforeEach(() => {
    vi.mocked(fetchAccountForSettlement).mockReset();
    vi.mocked(memberBelongsToOrg).mockReset();
    vi.mocked(createTransaction).mockReset();
  });

  const accountFixture = {
    id: cardAccountId,
    name: 'Amex',
    type: 'credit_card' as const,
    archivedAt: null,
  };

  it('forwards notes onto createTransaction payload when provided', async () => {
    vi.mocked(fetchAccountForSettlement)
      .mockResolvedValueOnce(accountFixture as never)
      .mockResolvedValueOnce({
        id: counterpartAccountId,
        name: 'RBC Chequing',
        archivedAt: null,
      } as never);
    vi.mocked(memberBelongsToOrg).mockResolvedValueOnce(true);
    vi.mocked(createTransaction).mockResolvedValueOnce({ id: 'tx1' } as never);

    await createSettlement('org_test123', {
      assignees: [{ memberId: '550e8400-e29b-41d4-a716-446655440001' }],
      accountId: cardAccountId,
      counterpartAccountId,
      amountCents: 5000,
      date: '2026-05-08',
      notes: 'paid via e-transfer',
    });

    const callArg = vi.mocked(createTransaction).mock.calls[0]?.[1];
    expect(callArg).toBeDefined();
    expect((callArg as { notes?: string }).notes).toBe('paid via e-transfer');
  });

  it('omits notes from createTransaction payload when not provided', async () => {
    vi.mocked(fetchAccountForSettlement)
      .mockResolvedValueOnce(accountFixture as never)
      .mockResolvedValueOnce({
        id: counterpartAccountId,
        name: 'RBC Chequing',
        archivedAt: null,
      } as never);
    vi.mocked(memberBelongsToOrg).mockResolvedValueOnce(true);
    vi.mocked(createTransaction).mockResolvedValueOnce({ id: 'tx1' } as never);

    await createSettlement('org_test123', {
      assignees: [{ memberId: '550e8400-e29b-41d4-a716-446655440001' }],
      accountId: cardAccountId,
      counterpartAccountId,
      amountCents: 5000,
      date: '2026-05-08',
    });

    const callArg = vi.mocked(createTransaction).mock.calls[0]?.[1];
    expect(callArg).toBeDefined();
    expect('notes' in (callArg as object)).toBe(false);
  });
});
