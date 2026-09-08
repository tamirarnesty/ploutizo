import { describe, expect, it } from 'vitest';
import type { OrgMember, SettlementAccountRow } from '@ploutizo/types';
import { buildCardBalanceViewModels } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';

const household: OrgMember[] = [
  {
    id: 'm1',
    orgId: 'org',
    role: 'admin',
    joinedAt: '',
    externalId: 'ext1',
    email: 'alex@example.com',
    imageUrl: null,
    firstName: 'Alex',
    lastName: 'Smith',
  },
  {
    id: 'm2',
    orgId: 'org',
    role: 'admin',
    joinedAt: '',
    externalId: 'ext2',
    email: 'alex.jones@example.com',
    imageUrl: null,
    firstName: 'Alex',
    lastName: 'Jones',
  },
];

const account = (): SettlementAccountRow => ({
  account: {
    id: 'acct-1',
    name: 'Card',
    type: 'credit_card',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    owners: [
      {
        id: 'm1',
        firstName: 'Alex',
        lastName: 'Smith',
        email: 'alex@example.com',
        imageUrl: null,
      },
    ],
  },
  totalBalanceCents: 100,
  sharedBalanceCents: 0,
  sharedParticipantIds: [],
  members: [
    {
      member: {
        id: 'm1',
        firstName: 'Alex',
        lastName: 'Smith',
        email: 'alex@example.com',
        imageUrl: null,
      },
      personalBalanceCents: 100,
    },
  ],
  dueDate: null,
  status: null,
});

describe('buildCardBalanceViewModels', () => {
  it('resolves short owner and attribution labels from household', () => {
    const [row] = buildCardBalanceViewModels([account()], household);
    expect(row.ownerDisplay.label).toBe('Alex Smith');
    expect(row.attributionChips[0]).toMatchObject({
      kind: 'member',
      memberId: 'm1',
      label: 'Alex Smith',
    });
  });

  it('precomputes settle menu entries sorted by member label with shared last', () => {
    const [row] = buildCardBalanceViewModels([account()], household);
    expect(row.settleMenuEntries).toEqual([
      {
        payToward: 'm1',
        label: 'Alex Smith',
        balanceCents: 100,
      },
      {
        payToward: 'shared',
        label: 'Shared',
        balanceCents: 0,
      },
    ]);
  });
});
