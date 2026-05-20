import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError, NotFoundError } from '../lib/errors';
import {
  fetchAccountForSettlement,
  fetchSettlementBalances,
  memberBelongsToOrg,
} from '../lib/queries/settlements';
import { listAccountMemberDetails } from '../lib/queries/accounts';
import {
  createSettlement,
  getSettlementBalances,
} from '../services/settlements';
import {
  checkCounterpartAccountOwnership,
  createTransaction,
} from '../services/transactions';
import type { SettlementBalanceRow } from '../lib/queries/settlements';

// Mock the QUERY layer only. The service module is NOT mocked here —
// the real getSettlementBalances code runs against the mocked query rows.
vi.mock('../lib/queries/settlements', () => ({
  fetchSettlementBalances: vi.fn(),
  fetchAccountForSettlement: vi.fn(),
  memberBelongsToOrg: vi.fn(),
}));

vi.mock('../lib/queries/accounts', () => ({
  listAccountMemberDetails: vi.fn(),
}));

// Mock createTransaction so createSettlement runs its real logic
// but the downstream DB write is replaced by a fixture.
vi.mock('../services/transactions', () => ({
  createTransaction: vi.fn(),
  checkCounterpartAccountOwnership: vi.fn(),
}));

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
  balanceCents: 0,
};

describe('getSettlementBalances service', () => {
  beforeEach(() => {
    vi.mocked(fetchSettlementBalances).mockReset();
    vi.mocked(listAccountMemberDetails).mockReset();
    vi.mocked(listAccountMemberDetails).mockResolvedValue([]);
  });

  it('GET-SETTLE-04: omits non-credit accounts where all member balances are zero (D-08)', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      {
        ...baseRow,
        accountType: 'chequing',
        memberId: 'm1',
        memberName: 'Alice',
        balanceCents: 0,
      },
      {
        ...baseRow,
        accountType: 'chequing',
        memberId: 'm2',
        memberName: 'Bob',
        balanceCents: 0,
      },
    ]);
    const r = await getSettlementBalances('org_test123');
    expect(r.accounts).toHaveLength(0);
  });

  it('GET-SETTLE-04b: includes credit_card when all member balances are zero', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      {
        ...baseRow,
        accountType: 'credit_card',
        memberId: 'm1',
        memberName: 'Alice',
        balanceCents: 0,
      },
      {
        ...baseRow,
        accountType: 'credit_card',
        memberId: 'm2',
        memberName: 'Bob',
        balanceCents: 0,
      },
    ]);
    const r = await getSettlementBalances('org_test123');
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0]?.account.type).toBe('credit_card');
    expect(r.accounts[0]?.totalBalanceCents).toBe(0);
  });

  it('GET-SETTLE-05: statementDueDay null => dueDate: null, status: null', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, statementDueDay: null, balanceCents: 5000 },
    ]);
    const r = await getSettlementBalances('org_test123');
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0].dueDate).toBeNull();
    expect(r.accounts[0].status).toBeNull();
  });

  it('GET-SETTLE-06: statementDueDay set, today 5 days before => due_soon', async () => {
    // today = 2026-05-15, statementDueDay = 20 → dueDate = 2026-05-20 (5 days away → due_soon)
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, statementDueDay: 20, balanceCents: 5000 },
    ]);
    const now = new Date('2026-05-15T00:00:00Z');
    const r = await getSettlementBalances('org_test123', now);
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0].dueDate).toBe('2026-05-20');
    expect(r.accounts[0].status).toBe('due_soon');
  });

  it('GET-SETTLE-07: totalBalanceCents = sum of member balances', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, memberId: 'm1', memberName: 'Alice', balanceCents: 5000 },
      { ...baseRow, memberId: 'm2', memberName: 'Bob', balanceCents: -1000 },
    ]);
    const r = await getSettlementBalances('org_test123');
    expect(r.accounts).toHaveLength(1);
    expect(r.accounts[0].totalBalanceCents).toBe(4000);
    expect(r.accounts[0].members).toHaveLength(2);
  });

  it('GET-SETTLE-08: attaches account owners from listAccountMemberDetails', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, balanceCents: 100 },
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
    expect(listAccountMemberDetails).toHaveBeenCalledWith(['a1']);
    expect(r.accounts[0]?.account.owners).toEqual([
      { id: 'm1', displayName: 'Alice', imageUrl: 'https://example.com/a.jpg' },
      { id: 'm2', displayName: 'Bob', imageUrl: null },
    ]);
  });
});

describe('createSettlement service', () => {
  const validInput = {
    payerMemberId: '550e8400-e29b-41d4-a716-446655440001',
    accountId: '550e8400-e29b-41d4-a716-446655440002',
    counterpartAccountId: '550e8400-e29b-41d4-a716-446655440003',
    amountCents: 5000,
    date: '2026-05-08',
  };

  beforeEach(() => {
    vi.mocked(fetchAccountForSettlement).mockReset();
    vi.mocked(memberBelongsToOrg).mockReset();
    vi.mocked(createTransaction).mockReset();
    vi.mocked(checkCounterpartAccountOwnership).mockReset();
    vi.mocked(checkCounterpartAccountOwnership).mockResolvedValue(true);
  });

  it('POST-SETTLE-06: account not found => throws NotFoundError("Account not found")', async () => {
    vi.mocked(fetchAccountForSettlement).mockResolvedValue(null);

    const err = await createSettlement('org_1', validInput).catch(
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Account not found');
  });

  it('POST-SETTLE-07: account archived => throws DomainError(400, "Cannot settle an archived account")', async () => {
    vi.mocked(fetchAccountForSettlement).mockResolvedValue({
      id: validInput.accountId,
      name: 'Amex Gold',
      archivedAt: new Date('2026-01-01'),
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
    vi.mocked(fetchAccountForSettlement).mockResolvedValue({
      id: validInput.accountId,
      name: 'Amex Gold',
      archivedAt: null,
    });
    vi.mocked(memberBelongsToOrg).mockResolvedValue(false);

    const err = await createSettlement('org_1', validInput).catch(
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe(
      'Member not found in this household'
    );
  });

  it('POST-SETTLE-09: happy path — invokes createTransaction with auto-filled payload', async () => {
    const mockInserted = { id: 'tx_1', type: 'settlement', amount: 5000 };
    vi.mocked(fetchAccountForSettlement).mockResolvedValue({
      id: validInput.accountId,
      name: 'Amex Gold',
      archivedAt: null,
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
    expect(callArg.description).toMatch(/^Settlement: /);
    expect(callArg.assignees).toHaveLength(1);
    expect(callArg.assignees![0].amountCents).toBe(validInput.amountCents);
    expect(result).toEqual(mockInserted);
  });

  it('POST-SETTLE-10: counterpart account not in org => throws NotFoundError', async () => {
    vi.mocked(fetchAccountForSettlement).mockResolvedValue({
      id: validInput.accountId,
      name: 'Amex Gold',
      archivedAt: null,
    });
    vi.mocked(memberBelongsToOrg).mockResolvedValue(true);
    vi.mocked(checkCounterpartAccountOwnership).mockResolvedValue(false);

    const err = await createSettlement('org_1', validInput).catch(
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Paid-from account not found');
  });
});

describe('createSettlement — notes forwarding (Phase 4.2 extension)', () => {
  beforeEach(() => {
    vi.mocked(fetchAccountForSettlement).mockReset();
    vi.mocked(memberBelongsToOrg).mockReset();
    vi.mocked(createTransaction).mockReset();
    vi.mocked(checkCounterpartAccountOwnership).mockReset();
    vi.mocked(checkCounterpartAccountOwnership).mockResolvedValue(true);
  });

  const accountFixture = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Amex',
    archivedAt: null,
  };

  it('forwards notes onto createTransaction payload when provided', async () => {
    vi.mocked(fetchAccountForSettlement).mockResolvedValueOnce(
      accountFixture as never
    );
    vi.mocked(memberBelongsToOrg).mockResolvedValueOnce(true);
    vi.mocked(createTransaction).mockResolvedValueOnce({ id: 'tx1' } as never);

    await createSettlement('org_test123', {
      payerMemberId: '550e8400-e29b-41d4-a716-446655440001',
      accountId: '550e8400-e29b-41d4-a716-446655440002',
      counterpartAccountId: '550e8400-e29b-41d4-a716-446655440003',
      amountCents: 5000,
      date: '2026-05-08',
      notes: 'paid via e-transfer',
    });

    const callArg = vi.mocked(createTransaction).mock.calls[0]?.[1];
    expect(callArg).toBeDefined();
    expect((callArg as { notes?: string }).notes).toBe('paid via e-transfer');
  });

  it('omits notes from createTransaction payload when not provided', async () => {
    vi.mocked(fetchAccountForSettlement).mockResolvedValueOnce(
      accountFixture as never
    );
    vi.mocked(memberBelongsToOrg).mockResolvedValueOnce(true);
    vi.mocked(createTransaction).mockResolvedValueOnce({ id: 'tx1' } as never);

    await createSettlement('org_test123', {
      payerMemberId: '550e8400-e29b-41d4-a716-446655440001',
      accountId: '550e8400-e29b-41d4-a716-446655440002',
      counterpartAccountId: '550e8400-e29b-41d4-a716-446655440003',
      amountCents: 5000,
      date: '2026-05-08',
    });

    const callArg = vi.mocked(createTransaction).mock.calls[0]?.[1];
    expect(callArg).toBeDefined();
    expect('notes' in (callArg as object)).toBe(false);
  });
});
