import { describe, expect, it } from 'vitest';
import type { SettlementAccountRow, SettlementStatus } from '@ploutizo/types';
import { getSettleInitialValues } from '@/components/dashboard/settle-dialog/getSettleInitialValues';

const fixture = (): SettlementAccountRow => ({
  account: {
    id: 'a1',
    name: 'Test Card',
    type: 'credit_card',
    institution: null,
    lastFour: null,
    statementDueDay: null,
    owners: [{ id: 'alice', displayName: 'Alice', imageUrl: null }],
  },
  totalBalanceCents: 400,
  members: [
    {
      member: { id: 'alice', name: 'Alice', avatarUrl: null },
      balanceCents: -100,
    },
    {
      member: { id: 'betty', name: 'Betty', avatarUrl: null },
      balanceCents: 500,
    },
    {
      member: { id: 'cas', name: 'Cas', avatarUrl: null },
      balanceCents: 0,
    },
  ],
  dueDate: null,
  status: null as SettlementStatus | null,
});

describe('getSettleInitialValues', () => {
  it('prioritizes initialPayerMemberId over balance>0 heuristic', () => {
    const v = getSettleInitialValues(
      fixture(),
      'bank-1',
      '2026-01-05',
      'alice'
    );
    expect(v.payerMemberId).toBe('alice');
    expect(v.amountDollars).toBe(1); // |-100| cents → 1.00
  });

  it('falls back to first positive balance when no explicit id', () => {
    const v = getSettleInitialValues(fixture(), 'bank-1', '2026-01-05', '');
    expect(v.payerMemberId).toBe('betty');
    expect(v.amountDollars).toBe(5);
  });
});
