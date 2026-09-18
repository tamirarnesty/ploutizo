import { describe, expect, it } from 'vitest';
import type { Account } from '@ploutizo/types';
import {
  getTransactionFormAccountOptionLabel,
  getTransactionFormArchiveDateError,
  getTransactionFormLastAvailableDate,
} from './getTransactionFormArchiveDate';

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
  account({ id: 'cheq-1', name: 'Chequing', type: 'chequing' }),
  account({
    id: 'cheq-archived',
    name: 'Old Chequing',
    type: 'chequing',
    archivedAt: '2026-01-15T00:00:00.000Z',
  }),
  account({
    id: 'sav-archived',
    name: 'Old Savings',
    type: 'savings',
    archivedAt: '2026-01-10T00:00:00.000Z',
  }),
];

describe('getTransactionFormLastAvailableDate', () => {
  it('returns the earliest selected archive date', () => {
    expect(
      getTransactionFormLastAvailableDate(
        accounts,
        'cheq-archived',
        'sav-archived'
      )
    ).toBe('2026-01-10');
  });

  it('returns null when selected accounts are active', () => {
    expect(
      getTransactionFormLastAvailableDate(accounts, 'cheq-1', '')
    ).toBeNull();
  });
});

describe('getTransactionFormArchiveDateError', () => {
  it('returns undefined for active accounts and historical archived dates', () => {
    expect(
      getTransactionFormArchiveDateError({
        accounts,
        date: '2026-06-01',
        accountId: 'cheq-1',
      })
    ).toBeUndefined();
    expect(
      getTransactionFormArchiveDateError({
        accounts,
        date: '2026-01-15',
        accountId: 'cheq-archived',
      })
    ).toBeUndefined();
  });

  it('blocks activity after an archived account date', () => {
    expect(
      getTransactionFormArchiveDateError({
        accounts,
        date: '2026-01-16',
        accountId: 'cheq-archived',
      })
    ).toBe('This account cannot receive activity after its archive date.');
  });

  it('blocks the counterpart independently of the transaction account', () => {
    expect(
      getTransactionFormArchiveDateError({
        accounts,
        date: '2026-01-16',
        accountId: 'cheq-1',
        counterpartAccountId: 'sav-archived',
      })
    ).toBe(
      'The counterpart account cannot receive activity after its archive date.'
    );
  });

  it('can report only the requested slot', () => {
    expect(
      getTransactionFormArchiveDateError({
        accounts,
        date: '2026-01-16',
        accountId: 'cheq-archived',
        counterpartAccountId: 'sav-archived',
        field: 'counterpartAccountId',
      })
    ).toBe(
      'The counterpart account cannot receive activity after its archive date.'
    );
  });
});

describe('getTransactionFormAccountOptionLabel', () => {
  it('marks archived accounts in the option label', () => {
    expect(getTransactionFormAccountOptionLabel(accounts[0])).toBe('Chequing');
    expect(getTransactionFormAccountOptionLabel(accounts[1])).toBe(
      'Old Chequing (archived)'
    );
  });
});
