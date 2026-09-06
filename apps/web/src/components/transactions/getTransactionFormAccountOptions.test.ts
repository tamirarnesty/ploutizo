import { describe, expect, it } from 'vitest';
import type { Account } from '@ploutizo/types';
import { getTransactionFormAccountOptions } from './getTransactionFormAccountOptions';

const account = (
  overrides: Partial<Account> & Pick<Account, 'id' | 'name' | 'type'>
): Account =>
  ({
    orgId: 'org-1',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
    ...overrides,
  }) as Account;

const accounts: Account[] = [
  account({ id: 'inv-1', name: 'FHSA', type: 'investment' }),
  account({ id: 'sav-1', name: 'Savings', type: 'savings' }),
  account({
    id: 'cheq-archived',
    name: 'Old Chequing',
    type: 'chequing',
    archivedAt: '2026-01-01',
  }),
  account({ id: 'cheq-zeta', name: 'Zeta Chequing', type: 'chequing' }),
  account({ id: 'cheq-alpha', name: 'Alpha Chequing', type: 'chequing' }),
  account({ id: 'card-1', name: 'Visa', type: 'credit_card' }),
  account({ id: 'prepaid-1', name: 'Cash', type: 'prepaid_cash' }),
];

const ids = (rows: Account[]) => rows.map((row) => row.id);

describe('getTransactionFormAccountOptions', () => {
  it('filters and orders expense account options by policy, not input order', () => {
    expect(
      ids(
        getTransactionFormAccountOptions({
          type: 'expense',
          slot: 'accountId',
          accounts,
        })
      )
    ).toEqual(['card-1', 'cheq-alpha', 'cheq-zeta', 'sav-1', 'prepaid-1']);
  });

  it('excludes investment and archived accounts from expense options', () => {
    const options = getTransactionFormAccountOptions({
      type: 'expense',
      slot: 'accountId',
      accounts,
    });

    expect(ids(options)).not.toContain('inv-1');
    expect(ids(options)).not.toContain('cheq-archived');
  });

  it('excludes credit cards from income options (previously unfiltered)', () => {
    expect(
      ids(
        getTransactionFormAccountOptions({
          type: 'income',
          slot: 'accountId',
          accounts,
        })
      )
    ).toEqual(['cheq-alpha', 'cheq-zeta', 'sav-1', 'prepaid-1']);
  });

  it('orders refund options the same way as expense', () => {
    expect(
      ids(
        getTransactionFormAccountOptions({
          type: 'refund',
          slot: 'accountId',
          accounts,
        })
      )
    ).toEqual(
      ids(
        getTransactionFormAccountOptions({
          type: 'expense',
          slot: 'accountId',
          accounts,
        })
      )
    );
  });

  it('keeps transfer destination as all non-source allowed types, ordered by policy', () => {
    expect(
      ids(
        getTransactionFormAccountOptions({
          type: 'transfer',
          slot: 'counterpartAccountId',
          accounts,
          otherSelectedAccountId: 'cheq-alpha',
        })
      )
    ).toEqual(['cheq-zeta', 'sav-1', 'prepaid-1', 'inv-1']);
  });

  it('excludes credit cards from transfer destination (prior dest list was all except source)', () => {
    const options = getTransactionFormAccountOptions({
      type: 'transfer',
      slot: 'counterpartAccountId',
      accounts,
      otherSelectedAccountId: 'cheq-alpha',
    });

    expect(ids(options)).not.toContain('card-1');
    expect(ids(options)).not.toContain('cheq-alpha');
  });

  it('returns only credit cards for settlement destination', () => {
    expect(
      ids(
        getTransactionFormAccountOptions({
          type: 'settlement',
          slot: 'accountId',
          accounts,
        })
      )
    ).toEqual(['card-1']);
  });

  it('returns chequing then savings for settlement source and excludes the card', () => {
    expect(
      ids(
        getTransactionFormAccountOptions({
          type: 'settlement',
          slot: 'counterpartAccountId',
          accounts,
          otherSelectedAccountId: 'card-1',
        })
      )
    ).toEqual(['cheq-alpha', 'cheq-zeta', 'sav-1']);
  });

  it('keeps contribution destination as investment-only, matching prior type filter', () => {
    expect(
      getTransactionFormAccountOptions({
        type: 'contribution',
        slot: 'counterpartAccountId',
        accounts,
        otherSelectedAccountId: 'cheq-alpha',
      })
    ).toEqual([accounts[0]]);
  });

  it('limits contribution source to chequing and savings', () => {
    expect(
      ids(
        getTransactionFormAccountOptions({
          type: 'contribution',
          slot: 'accountId',
          accounts,
        })
      )
    ).toEqual(['cheq-alpha', 'cheq-zeta', 'sav-1']);
  });

  it('preserves an archived account when editing that selection', () => {
    expect(
      ids(
        getTransactionFormAccountOptions({
          type: 'expense',
          slot: 'accountId',
          accounts,
          preserveAccountId: 'cheq-archived',
        })
      )
    ).toEqual([
      'card-1',
      'cheq-alpha',
      'cheq-archived',
      'cheq-zeta',
      'sav-1',
      'prepaid-1',
    ]);
  });
});
