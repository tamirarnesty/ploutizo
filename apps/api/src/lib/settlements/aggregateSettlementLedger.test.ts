import { describe, expect, it } from 'vitest';
import {
  aggregateSettlementLedger,
  settlementLedgerPairKey,
} from './aggregateSettlementLedger';
import type { SettlementLedgerScanRow } from './aggregateSettlementLedger';

const row = (
  overrides: Partial<SettlementLedgerScanRow> &
    Pick<SettlementLedgerScanRow, 'transactionId' | 'memberId'>
): SettlementLedgerScanRow => ({
  accountId: 'card-a',
  assigneeCount: 1,
  signedAssigneeCents: 0,
  signedTransactionCents: 0,
  ...overrides,
});

const personal = (
  buckets: ReturnType<typeof aggregateSettlementLedger>,
  accountId: string,
  memberId: string
) => buckets.personalByPair.get(settlementLedgerPairKey(accountId, memberId));

describe('aggregateSettlementLedger', () => {
  it('returns empty buckets for an empty scan', () => {
    const buckets = aggregateSettlementLedger([]);
    expect(buckets.personalByPair.size).toBe(0);
    expect(buckets.sharedByAccount.size).toBe(0);
    expect(buckets.participantsByAccount.size).toBe(0);
  });

  it('personal transaction (assignee count 1) applies signed assignee cents to that member only', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-personal-expense',
        memberId: 'alice',
        assigneeCount: 1,
        signedAssigneeCents: 5000,
        signedTransactionCents: 5000,
      }),
    ]);

    expect(personal(buckets, 'card-a', 'alice')).toBe(5000);
    expect(personal(buckets, 'card-a', 'bob')).toBeUndefined();
    expect(buckets.sharedByAccount.size).toBe(0);
    expect(buckets.participantsByAccount.size).toBe(0);
  });

  it('personal refund/settlement (negative signed cents) reduces personal balance', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-expense',
        memberId: 'alice',
        signedAssigneeCents: 10_000,
        signedTransactionCents: 10_000,
      }),
      row({
        transactionId: 'tx-personal-settlement',
        memberId: 'alice',
        signedAssigneeCents: -15_000,
        signedTransactionCents: -15_000,
      }),
    ]);

    expect(personal(buckets, 'card-a', 'alice')).toBe(-5000);
    expect(buckets.sharedByAccount.size).toBe(0);
  });

  it('accumulates multiple personal transactions on the same member × card', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-1',
        memberId: 'alice',
        signedAssigneeCents: 1000,
        signedTransactionCents: 1000,
      }),
      row({
        transactionId: 'tx-2',
        memberId: 'alice',
        signedAssigneeCents: 2500,
        signedTransactionCents: 2500,
      }),
    ]);

    expect(personal(buckets, 'card-a', 'alice')).toBe(3500);
  });

  it('shared transaction (assignee count >= 2) applies signed transaction cents once, not per assignee', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-shared-dinner',
        memberId: 'alice',
        assigneeCount: 2,
        signedAssigneeCents: 6000,
        signedTransactionCents: 12_000,
      }),
      row({
        transactionId: 'tx-shared-dinner',
        memberId: 'bob',
        assigneeCount: 2,
        signedAssigneeCents: 6000,
        signedTransactionCents: 12_000,
      }),
    ]);

    expect(buckets.sharedByAccount.get('card-a')).toBe(12_000);
    expect(personal(buckets, 'card-a', 'alice')).toBeUndefined();
    expect(personal(buckets, 'card-a', 'bob')).toBeUndefined();
    expect(buckets.participantsByAccount.get('card-a')).toEqual([
      'alice',
      'bob',
    ]);
  });

  it('shared settlement/refund reduces shared balance; personal buckets stay untouched', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-shared-expense',
        memberId: 'alice',
        assigneeCount: 2,
        signedAssigneeCents: 4000,
        signedTransactionCents: 8000,
      }),
      row({
        transactionId: 'tx-shared-expense',
        memberId: 'bob',
        assigneeCount: 2,
        signedAssigneeCents: 4000,
        signedTransactionCents: 8000,
      }),
      row({
        transactionId: 'tx-shared-settlement',
        memberId: 'alice',
        assigneeCount: 2,
        signedAssigneeCents: -2500,
        signedTransactionCents: -5000,
      }),
      row({
        transactionId: 'tx-shared-settlement',
        memberId: 'bob',
        assigneeCount: 2,
        signedAssigneeCents: -2500,
        signedTransactionCents: -5000,
      }),
    ]);

    expect(buckets.sharedByAccount.get('card-a')).toBe(3000);
    expect(buckets.personalByPair.size).toBe(0);
  });

  it('three-assignee shared scan does not triple-count the transaction amount', () => {
    const members = ['alice', 'bob', 'cara'] as const;
    const buckets = aggregateSettlementLedger(
      members.map((memberId) =>
        row({
          transactionId: 'tx-triple',
          memberId,
          assigneeCount: 3,
          signedAssigneeCents: 3333,
          signedTransactionCents: 10_000,
        })
      )
    );

    expect(buckets.sharedByAccount.get('card-a')).toBe(10_000);
    expect(buckets.participantsByAccount.get('card-a')).toEqual([
      'alice',
      'bob',
      'cara',
    ]);
  });

  it('sorts shared participant ids with localeCompare (not insertion order)', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-shared',
        memberId: 'zoe',
        assigneeCount: 2,
        signedAssigneeCents: 50,
        signedTransactionCents: 100,
      }),
      row({
        transactionId: 'tx-shared',
        memberId: 'amy',
        assigneeCount: 2,
        signedAssigneeCents: 50,
        signedTransactionCents: 100,
      }),
    ]);

    expect(buckets.participantsByAccount.get('card-a')).toEqual(['amy', 'zoe']);
  });

  it('unions shared participants across multiple shared transactions on a card', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-ab',
        memberId: 'alice',
        assigneeCount: 2,
        signedAssigneeCents: 10,
        signedTransactionCents: 20,
      }),
      row({
        transactionId: 'tx-ab',
        memberId: 'bob',
        assigneeCount: 2,
        signedAssigneeCents: 10,
        signedTransactionCents: 20,
      }),
      row({
        transactionId: 'tx-bc',
        memberId: 'bob',
        assigneeCount: 2,
        signedAssigneeCents: 15,
        signedTransactionCents: 30,
      }),
      row({
        transactionId: 'tx-bc',
        memberId: 'cara',
        assigneeCount: 2,
        signedAssigneeCents: 15,
        signedTransactionCents: 30,
      }),
    ]);

    expect(buckets.sharedByAccount.get('card-a')).toBe(50);
    expect(buckets.participantsByAccount.get('card-a')).toEqual([
      'alice',
      'bob',
      'cara',
    ]);
  });

  it('keeps personal and shared buckets independent on the same card (ADR 0002)', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-personal',
        memberId: 'alice',
        assigneeCount: 1,
        signedAssigneeCents: 4000,
        signedTransactionCents: 4000,
      }),
      row({
        transactionId: 'tx-shared',
        memberId: 'alice',
        assigneeCount: 2,
        signedAssigneeCents: 1500,
        signedTransactionCents: 3000,
      }),
      row({
        transactionId: 'tx-shared',
        memberId: 'bob',
        assigneeCount: 2,
        signedAssigneeCents: 1500,
        signedTransactionCents: 3000,
      }),
    ]);

    expect(personal(buckets, 'card-a', 'alice')).toBe(4000);
    expect(personal(buckets, 'card-a', 'bob')).toBeUndefined();
    expect(buckets.sharedByAccount.get('card-a')).toBe(3000);
    expect(buckets.participantsByAccount.get('card-a')).toEqual([
      'alice',
      'bob',
    ]);
  });

  it('isolates buckets per card (member ↔ card obligation)', () => {
    const buckets = aggregateSettlementLedger([
      row({
        accountId: 'card-a',
        transactionId: 'tx-a',
        memberId: 'alice',
        signedAssigneeCents: 1000,
        signedTransactionCents: 1000,
      }),
      row({
        accountId: 'card-b',
        transactionId: 'tx-b',
        memberId: 'alice',
        signedAssigneeCents: 2500,
        signedTransactionCents: 2500,
      }),
    ]);

    expect(personal(buckets, 'card-a', 'alice')).toBe(1000);
    expect(personal(buckets, 'card-b', 'alice')).toBe(2500);
    expect(buckets.sharedByAccount.size).toBe(0);
  });

  it('card balance identity: Σ personal + shared equals unique signed transaction amounts', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-alice',
        memberId: 'alice',
        signedAssigneeCents: 5000,
        signedTransactionCents: 5000,
      }),
      row({
        transactionId: 'tx-bob',
        memberId: 'bob',
        signedAssigneeCents: -1000,
        signedTransactionCents: -1000,
      }),
      row({
        transactionId: 'tx-shared',
        memberId: 'alice',
        assigneeCount: 2,
        signedAssigneeCents: 1500,
        signedTransactionCents: 3000,
      }),
      row({
        transactionId: 'tx-shared',
        memberId: 'bob',
        assigneeCount: 2,
        signedAssigneeCents: 1500,
        signedTransactionCents: 3000,
      }),
    ]);

    const personalTotal = [...buckets.personalByPair.values()].reduce(
      (sum, cents) => sum + cents,
      0
    );
    const sharedTotal = buckets.sharedByAccount.get('card-a') ?? 0;
    expect(personalTotal + sharedTotal).toBe(7000);
  });

  it('ignores scan rows with assignee count below 1', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-empty',
        memberId: 'alice',
        assigneeCount: 0,
        signedAssigneeCents: 999,
        signedTransactionCents: 999,
      }),
    ]);

    expect(buckets.personalByPair.size).toBe(0);
    expect(buckets.sharedByAccount.size).toBe(0);
    expect(buckets.participantsByAccount.size).toBe(0);
  });

  it('does not add personal-transaction members as shared participants', () => {
    const buckets = aggregateSettlementLedger([
      row({
        transactionId: 'tx-personal',
        memberId: 'cara',
        signedAssigneeCents: 800,
        signedTransactionCents: 800,
      }),
      row({
        transactionId: 'tx-shared',
        memberId: 'alice',
        assigneeCount: 2,
        signedAssigneeCents: 50,
        signedTransactionCents: 100,
      }),
      row({
        transactionId: 'tx-shared',
        memberId: 'bob',
        assigneeCount: 2,
        signedAssigneeCents: 50,
        signedTransactionCents: 100,
      }),
    ]);

    expect(buckets.participantsByAccount.get('card-a')).toEqual([
      'alice',
      'bob',
    ]);
  });
});
