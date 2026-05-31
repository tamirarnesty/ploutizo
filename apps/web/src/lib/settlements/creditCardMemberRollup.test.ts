import { describe, expect, it } from 'vitest';
import type { SettlementAccountRow } from '@ploutizo/types';
import { computeCreditCardMemberRollup } from './creditCardMemberRollup';

const row = (
  overrides: Partial<SettlementAccountRow> &
    Pick<SettlementAccountRow, 'account'>
): SettlementAccountRow =>
  ({
    totalBalanceCents: 0,
    sharedBalanceCents: 0,
    sharedParticipantIds: [],
    members: [],
    dueDate: null,
    status: null,
    ...overrides,
  }) as SettlementAccountRow;

describe('computeCreditCardMemberRollup', () => {
  it('returns empty rollup when there are no credit cards', () => {
    const result = computeCreditCardMemberRollup([]);
    expect(result.hasHouseholdCreditCards).toBe(false);
    expect(result.memberRollup.size).toBe(0);
    expect(result.householdSummary).toEqual({
      sharedRollupCents: 0,
      cardTotalCents: 0,
    });
  });

  it('aggregates personal and shared balances across cards', () => {
    const result = computeCreditCardMemberRollup([
      row({
        account: {
          id: 'c1',
          type: 'credit_card',
          name: 'Visa',
        } as SettlementAccountRow['account'],
        totalBalanceCents: 5000,
        sharedBalanceCents: 2000,
        members: [
          {
            member: { id: 'alice', name: 'Alice', avatarUrl: null },
            personalBalanceCents: 1000,
          },
        ],
      }),
      row({
        account: {
          id: 'c2',
          type: 'credit_card',
          name: 'Amex',
        } as SettlementAccountRow['account'],
        totalBalanceCents: 3000,
        sharedBalanceCents: 500,
        members: [
          {
            member: { id: 'alice', name: 'Alice', avatarUrl: null },
            personalBalanceCents: 500,
          },
        ],
      }),
    ]);

    expect(result.hasHouseholdCreditCards).toBe(true);
    expect(result.memberRollup.get('alice')).toEqual({
      cents: 1500,
      cardCount: 2,
    });
    expect(result.householdSummary).toEqual({
      sharedRollupCents: 2500,
      cardTotalCents: 8000,
    });
  });
});
