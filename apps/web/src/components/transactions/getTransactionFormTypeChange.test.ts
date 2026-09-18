import { describe, expect, it } from 'vitest';
import type { Account } from '@ploutizo/types';
import { getTransactionFormTypeChangePatch } from './getTransactionFormTypeChange';

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
  account({ id: 'card-1', name: 'Visa', type: 'credit_card' }),
  account({ id: 'cheq-1', name: 'Chequing', type: 'chequing' }),
  account({ id: 'inv-1', name: 'FHSA', type: 'investment' }),
];

const values = {
  accountId: 'card-1',
  counterpartAccountId: 'cheq-1',
  categoryId: 'cat-1',
  refundOf: 'tx-1',
  incomeType: 'direct_deposit',
};

describe('getTransactionFormTypeChangePatch', () => {
  it('clears counterpart and income fields when switching to expense, keeps category', () => {
    expect(
      getTransactionFormTypeChangePatch({
        type: 'expense',
        accounts,
        values,
      })
    ).toEqual({
      refundOf: '',
      incomeType: '',
      counterpartAccountId: '',
    });
  });

  it('keeps categoryId when switching expense to refund', () => {
    expect(
      getTransactionFormTypeChangePatch({
        type: 'refund',
        accounts,
        values: { ...values, counterpartAccountId: '', incomeType: '' },
      })
    ).toEqual({
      incomeType: '',
      counterpartAccountId: '',
    });
  });

  it('clears category and a credit-card account when switching to contribution', () => {
    expect(
      getTransactionFormTypeChangePatch({
        type: 'contribution',
        accounts,
        values,
      })
    ).toEqual({
      categoryId: '',
      refundOf: '',
      incomeType: '',
      accountId: '',
      counterpartAccountId: '',
    });
  });

  it('keeps a chequing account when switching expense to contribution', () => {
    expect(
      getTransactionFormTypeChangePatch({
        type: 'contribution',
        accounts,
        values: { ...values, accountId: 'cheq-1' },
      })
    ).toEqual({
      categoryId: '',
      refundOf: '',
      incomeType: '',
      counterpartAccountId: '',
    });
  });

  it('keeps optional settlement categoryId and a valid funding counterpart', () => {
    expect(
      getTransactionFormTypeChangePatch({
        type: 'settlement',
        accounts,
        values: {
          accountId: 'card-1',
          counterpartAccountId: 'cheq-1',
          categoryId: 'cat-bill',
          refundOf: 'tx-1',
          incomeType: 'cash',
        },
      })
    ).toEqual({
      refundOf: '',
      incomeType: '',
    });
  });
});
