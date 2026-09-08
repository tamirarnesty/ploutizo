import { describe, expect, it } from 'vitest';
import type {
  Account,
  SettlementAccountRow,
  SettlementStatus,
} from '@ploutizo/types';
import {
  composeSettleAmountForPayToward,
  composeSettleFormValues,
} from './composeSettleForm';

const fixture = (): SettlementAccountRow => ({
  account: {
    id: 'a1',
    name: 'Test Card',
    type: 'credit_card',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    owners: [
      {
        id: 'alice',
        firstName: 'Alice',
        lastName: null,
        email: 'alice@example.com',
        imageUrl: null,
      },
    ],
  },
  totalBalanceCents: 400,
  sharedBalanceCents: 200,
  sharedParticipantIds: ['alice', 'betty'],
  members: [
    {
      member: {
        id: 'alice',
        firstName: 'Alice',
        lastName: null,
        email: 'alice@example.com',
        imageUrl: null,
      },
      personalBalanceCents: -100,
    },
    {
      member: {
        id: 'betty',
        firstName: 'Betty',
        lastName: null,
        email: 'betty@example.com',
        imageUrl: null,
      },
      personalBalanceCents: 500,
    },
    {
      member: {
        id: 'cas',
        firstName: 'Cas',
        lastName: null,
        email: 'cas@example.com',
        imageUrl: null,
      },
      personalBalanceCents: 0,
    },
  ],
  dueDate: null,
  status: null as SettlementStatus | null,
});

const account = (
  overrides: Partial<Account> & Pick<Account, 'id' | 'name' | 'type'>
): Account =>
  ({
    orgId: 'org',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
    ...overrides,
  }) as Account;

const sourceAccounts: Account[] = [
  account({
    id: 'bank-alice',
    name: 'Alice Chequing',
    type: 'chequing',
    owners: [
      {
        id: 'alice',
        firstName: 'Alice',
        lastName: null,
        email: 'alice@example.com',
        imageUrl: null,
      },
    ],
  }),
  account({
    id: 'bank-joint',
    name: 'Joint',
    type: 'chequing',
    owners: [
      {
        id: 'alice',
        firstName: 'Alice',
        lastName: null,
        email: 'alice@example.com',
        imageUrl: null,
      },
      {
        id: 'betty',
        firstName: 'Betty',
        lastName: null,
        email: 'betty@example.com',
        imageUrl: null,
      },
    ],
  }),
];

describe('composeSettleFormValues', () => {
  it('uses explicit member pay-toward and prefill from personal balance', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'alice'
    );
    expect(v.payToward).toBe('alice');
    expect(v.amountDollars).toBe(0);
    expect(v.sourceAccountId).toBe('bank-alice');
    expect(v.date).toBe('2026-01-05');
    expect(v.notes).toBe('');
  });

  it('prefills positive personal balance for selected member', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'betty'
    );
    expect(v.payToward).toBe('betty');
    expect(v.amountDollars).toBe(5);
  });

  it('shared pay-toward prefill uses shared balance and joint paid-from default', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'shared'
    );
    expect(v.payToward).toBe('shared');
    expect(v.amountDollars).toBe(2);
    expect(v.sourceAccountId).toBe('bank-joint');
  });

  it('falls back to the first allowed source when the member has no sole-owned account', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'betty'
    );
    expect(v.sourceAccountId).toBe('bank-alice');
  });

  it('prefers joint chequing over other joint funding accounts for shared', () => {
    const v = composeSettleFormValues(
      fixture(),
      [
        account({
          id: 'joint-savings',
          name: 'Joint Savings',
          type: 'savings',
          owners: [
            {
              id: 'alice',
              firstName: 'Alice',
              lastName: null,
              email: 'alice@example.com',
              imageUrl: null,
            },
            {
              id: 'betty',
              firstName: 'Betty',
              lastName: null,
              email: 'betty@example.com',
              imageUrl: null,
            },
          ],
        }),
        ...sourceAccounts,
      ],
      '2026-01-05',
      'shared'
    );
    expect(v.sourceAccountId).toBe('bank-joint');
  });

  it('uses any joint funding account when there is no joint chequing', () => {
    const v = composeSettleFormValues(
      fixture(),
      [
        account({
          id: 'bank-alice',
          name: 'Alice Chequing',
          type: 'chequing',
          owners: [
            {
              id: 'alice',
              firstName: 'Alice',
              lastName: null,
              email: 'alice@example.com',
              imageUrl: null,
            },
          ],
        }),
        account({
          id: 'joint-savings',
          name: 'Joint Savings',
          type: 'savings',
          owners: [
            {
              id: 'alice',
              firstName: 'Alice',
              lastName: null,
              email: 'alice@example.com',
              imageUrl: null,
            },
            {
              id: 'betty',
              firstName: 'Betty',
              lastName: null,
              email: 'betty@example.com',
              imageUrl: null,
            },
          ],
        }),
      ],
      '2026-01-05',
      'shared'
    );
    expect(v.sourceAccountId).toBe('joint-savings');
  });

  it('falls back to the first allowed source when shared has no joint account', () => {
    const v = composeSettleFormValues(
      fixture(),
      [
        account({
          id: 'bank-alice',
          name: 'Alice Chequing',
          type: 'chequing',
          owners: [
            {
              id: 'alice',
              firstName: 'Alice',
              lastName: null,
              email: 'alice@example.com',
              imageUrl: null,
            },
          ],
        }),
      ],
      '2026-01-05',
      'shared'
    );
    expect(v.sourceAccountId).toBe('bank-alice');
  });

  it('prefills zero for an unknown member id', () => {
    const v = composeSettleFormValues(
      fixture(),
      sourceAccounts,
      '2026-01-05',
      'unknown'
    );
    expect(v.amountDollars).toBe(0);
  });
});

describe('composeSettleAmountForPayToward', () => {
  it('matches compose amount prefill for member and shared pay-toward', () => {
    const accountRow = fixture();
    expect(composeSettleAmountForPayToward(accountRow, 'alice')).toBe(0);
    expect(composeSettleAmountForPayToward(accountRow, 'betty')).toBe(5);
    expect(composeSettleAmountForPayToward(accountRow, 'shared')).toBe(2);
    expect(composeSettleAmountForPayToward(accountRow, 'cas')).toBe(0);
  });
});
