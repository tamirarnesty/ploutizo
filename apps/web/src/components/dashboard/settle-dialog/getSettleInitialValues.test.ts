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
  sharedBalanceCents: 200,
  sharedParticipantIds: ['alice', 'betty'],
  members: [
    {
      member: { id: 'alice', name: 'Alice', avatarUrl: null },
      personalBalanceCents: -100,
    },
    {
      member: { id: 'betty', name: 'Betty', avatarUrl: null },
      personalBalanceCents: 500,
    },
    {
      member: { id: 'cas', name: 'Cas', avatarUrl: null },
      personalBalanceCents: 0,
    },
  ],
  dueDate: null,
  status: null as SettlementStatus | null,
});

const sourceAccounts = [
  {
    id: 'bank-alice',
    orgId: 'org',
    name: 'Alice Chequing',
    type: 'chequing' as const,
    institution: null,
    lastFour: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [{ id: 'alice', displayName: 'Alice', imageUrl: null }],
  },
  {
    id: 'bank-joint',
    orgId: 'org',
    name: 'Joint',
    type: 'chequing' as const,
    institution: null,
    lastFour: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [
      { id: 'alice', displayName: 'Alice', imageUrl: null },
      { id: 'betty', displayName: 'Betty', imageUrl: null },
    ],
  },
];

describe('getSettleInitialValues', () => {
  it('uses explicit member pay-toward and prefill from personal balance', () => {
    const v = getSettleInitialValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'alice'
    );
    expect(v.payToward).toBe('alice');
    expect(v.amountDollars).toBe(0);
    expect(v.sourceAccountId).toBe('bank-alice');
  });

  it('prefills positive personal balance for selected member', () => {
    const v = getSettleInitialValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'betty'
    );
    expect(v.payToward).toBe('betty');
    expect(v.amountDollars).toBe(5);
  });

  it('shared pay-toward prefill uses shared balance and joint paid-from default', () => {
    const v = getSettleInitialValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'shared'
    );
    expect(v.payToward).toBe('shared');
    expect(v.amountDollars).toBe(2);
    expect(v.sourceAccountId).toBe('bank-joint');
  });
});
