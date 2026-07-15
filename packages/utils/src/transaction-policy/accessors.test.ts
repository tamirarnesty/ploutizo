import { describe, expect, it } from 'vitest';
import {
  getAccountOptionsForTransactionSlot,
  getTransactionFieldsToClear,
  getTransactionTypePolicy,
  resolveTransactionDescriptionPolicy,
  validateTransactionAccountPolicy,
} from './accessors';

const accounts = [
  {
    id: 'card-1',
    name: 'Visa',
    type: 'credit_card' as const,
    archivedAt: null,
  },
  {
    id: 'cheq-1',
    name: 'Chequing',
    type: 'chequing' as const,
    archivedAt: null,
  },
  {
    id: 'cheq-2',
    name: 'Archived Chequing',
    type: 'chequing' as const,
    archivedAt: '2026-01-01',
  },
  {
    id: 'sav-1',
    name: 'Savings',
    type: 'savings' as const,
    archivedAt: null,
  },
  {
    id: 'inv-1',
    name: 'FHSA',
    type: 'investment' as const,
    archivedAt: null,
  },
];

describe('getTransactionTypePolicy', () => {
  it('expands account slots with ordered allowed account types', () => {
    const policy = getTransactionTypePolicy('expense');

    expect(policy.accountSlots).toEqual([
      {
        field: 'accountId',
        role: 'expense_account',
        required: true,
        allowedAccountTypes: [
          'credit_card',
          'chequing',
          'savings',
          'prepaid_cash',
          'e_transfer',
        ],
        relationshipRules: [],
      },
    ]);
    expect(policy.scalarFields).toEqual({
      categoryId: 'optional',
      notes: 'optional',
    });
    expect(policy.description).toEqual({ mode: 'manual' });
  });

  it('includes counterpart slot and relationship rules for transfer', () => {
    const policy = getTransactionTypePolicy('transfer');

    expect(policy.accountSlots).toHaveLength(2);
    expect(policy.accountSlots[1]).toMatchObject({
      field: 'counterpartAccountId',
      role: 'transfer_destination_account',
      required: true,
      relationshipRules: ['different_accounts'],
    });
    expect(policy.description).toEqual({
      mode: 'generated',
      source: 'account_pair',
    });
  });
});

describe('resolveTransactionDescriptionPolicy', () => {
  it('returns manual for expense and income', () => {
    expect(resolveTransactionDescriptionPolicy({ type: 'expense' })).toEqual({
      mode: 'manual',
    });
    expect(resolveTransactionDescriptionPolicy({ type: 'income' })).toEqual({
      mode: 'manual',
    });
  });

  it('returns generated for transfer, settlement, and contribution', () => {
    expect(resolveTransactionDescriptionPolicy({ type: 'transfer' })).toEqual({
      mode: 'generated',
    });
    expect(resolveTransactionDescriptionPolicy({ type: 'settlement' })).toEqual({
      mode: 'generated',
    });
    expect(
      resolveTransactionDescriptionPolicy({ type: 'contribution' })
    ).toEqual({
      mode: 'generated',
    });
  });

  it('returns generated for linked refunds only when refundOf is set', () => {
    expect(
      resolveTransactionDescriptionPolicy({ type: 'refund', refundOf: '' })
    ).toEqual({ mode: 'manual' });
    expect(
      resolveTransactionDescriptionPolicy({
        type: 'refund',
        refundOf: 'tx-1',
      })
    ).toEqual({ mode: 'generated' });
  });
});

describe('getTransactionFieldsToClear', () => {
  it('clears counterpart and income fields when switching to expense', () => {
    expect(getTransactionFieldsToClear('expense')).toEqual([
      'refundOf',
      'incomeType',
      'counterpartAccountId',
    ]);
  });

  it('clears category and refund fields when switching to transfer', () => {
    expect(getTransactionFieldsToClear('transfer')).toEqual([
      'categoryId',
      'refundOf',
      'incomeType',
    ]);
  });
});

describe('getAccountOptionsForTransactionSlot', () => {
  it('filters and orders expense account options by policy', () => {
    const options = getAccountOptionsForTransactionSlot({
      type: 'expense',
      slot: 'accountId',
      accounts,
    });

    expect(options.map((account) => account.id)).toEqual([
      'card-1',
      'cheq-1',
      'sav-1',
    ]);
  });

  it('excludes archived accounts unless preserved for edit', () => {
    const chequingOnlyAccounts = [
      {
        id: 'cheq-1',
        name: 'Chequing',
        type: 'chequing' as const,
        archivedAt: null,
      },
      {
        id: 'cheq-2',
        name: 'Archived Chequing',
        type: 'chequing' as const,
        archivedAt: '2026-01-01',
      },
    ];

    const options = getAccountOptionsForTransactionSlot({
      type: 'contribution',
      slot: 'accountId',
      accounts: chequingOnlyAccounts,
      preserveAccountId: 'cheq-2',
    });

    expect(options.map((account) => account.id)).toEqual(['cheq-2', 'cheq-1']);
  });

  it('excludes the selected source account from transfer destination options', () => {
    const options = getAccountOptionsForTransactionSlot({
      type: 'transfer',
      slot: 'counterpartAccountId',
      accounts,
      otherSelectedAccountId: 'cheq-1',
    });

    expect(options.map((account) => account.id)).not.toContain('cheq-1');
  });

  it('returns only credit cards for settlement scoped account slot', () => {
    const options = getAccountOptionsForTransactionSlot({
      type: 'settlement',
      slot: 'accountId',
      accounts,
    });

    expect(options).toEqual([accounts[0]]);
  });

  it('returns only investment accounts for contribution destination slot', () => {
    const options = getAccountOptionsForTransactionSlot({
      type: 'contribution',
      slot: 'counterpartAccountId',
      accounts,
    });

    expect(options).toEqual([accounts[4]]);
  });
});

describe('validateTransactionAccountPolicy', () => {
  it('accepts valid expense account types', () => {
    const result = validateTransactionAccountPolicy({
      type: 'expense',
      account: { id: 'card-1', type: 'credit_card' },
    });

    expect(result).toEqual({ valid: true, violations: [] });
  });

  it('rejects disallowed account types', () => {
    const result = validateTransactionAccountPolicy({
      type: 'income',
      account: { id: 'card-1', type: 'credit_card' },
    });

    expect(result.valid).toBe(false);
    expect(result.violations[0]?.code).toBe('disallowed_account_type');
  });

  it('requires counterpart account for transfer', () => {
    const result = validateTransactionAccountPolicy({
      type: 'transfer',
      account: { id: 'cheq-1', type: 'chequing' },
    });

    expect(result.valid).toBe(false);
    expect(result.violations[0]?.code).toBe('missing_account');
  });

  it('rejects same-account transfer writes on the counterpart slot', () => {
    const result = validateTransactionAccountPolicy({
      type: 'transfer',
      account: { id: 'cheq-1', type: 'chequing' },
      counterpartAccount: { id: 'cheq-1', type: 'chequing' },
    });

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual([
      {
        field: 'counterpartAccountId',
        code: 'same_account_not_allowed',
        message: 'Transaction account and counterpart account must differ.',
      },
    ]);
  });

  it('validates settlement funding account types', () => {
    const valid = validateTransactionAccountPolicy({
      type: 'settlement',
      account: { id: 'card-1', type: 'credit_card' },
      counterpartAccount: { id: 'sav-1', type: 'savings' },
    });
    const invalid = validateTransactionAccountPolicy({
      type: 'settlement',
      account: { id: 'card-1', type: 'credit_card' },
      counterpartAccount: { id: 'inv-1', type: 'investment' },
    });

    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
  });

  it('rejects prepaid_cash as a settlement funding account', () => {
    const result = validateTransactionAccountPolicy({
      type: 'settlement',
      account: { id: 'card-1', type: 'credit_card' },
      counterpartAccount: { id: 'cash-1', type: 'prepaid_cash' },
    });

    expect(result.valid).toBe(false);
    expect(result.violations[0]?.code).toBe('disallowed_account_type');
  });

  it('requires counterpart account for saved settlement writes', () => {
    const result = validateTransactionAccountPolicy({
      type: 'settlement',
      account: { id: 'card-1', type: 'credit_card' },
    });

    expect(result.valid).toBe(false);
    expect(result.violations[0]?.code).toBe('missing_account');
  });
});
