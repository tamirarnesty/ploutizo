import { describe, expect, it } from 'vitest';
import { formatGeneratedTransactionDescriptionFromAccounts } from '@ploutizo/utils/transaction-policy';
import type { Account } from '@ploutizo/types';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { buildDefaultValues, toApiPayload } from './useTransactionForm';
import type { TransactionFormValues } from '../types';

const accounts: Account[] = [
  {
    id: 'card-1',
    orgId: 'org-1',
    name: 'Amex Cobalt',
    type: 'credit_card',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
  },
  {
    id: 'bank-1',
    orgId: 'org-1',
    name: 'Emily WS',
    type: 'chequing',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
  },
  {
    id: 'inv-1',
    orgId: 'org-1',
    name: 'FHSA',
    type: 'investment',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
  },
];

const transactionStub = (
  overrides: Partial<TransactionRow> &
    Pick<TransactionRow, 'type' | 'accountId' | 'description'>
): TransactionRow =>
  ({
    id: 'tx-1',
    counterpartAccountId: null,
    amount: 1976,
    date: '2026-06-04',
    accountName: null,
    counterpartAccountName: null,
    categoryId: null,
    refundOf: null,
    incomeType: null,
    notes: null,
    tags: [],
    assignees: [],
    ...overrides,
  }) as TransactionRow;

const baseForm = (): TransactionFormValues => ({
  type: 'expense',
  accountId: '00000000-0000-4000-8000-000000000001',
  amount: 10,
  date: '2026-01-15',
  description: 'Test',
  tagIds: [],
  categoryId: '',
  refundOf: '',
  incomeType: '',
  counterpartAccountId: '',
  notes: '',
  assignees: [],
});

describe('buildDefaultValues', () => {
  it('uses the locked settlement template in edit defaults when stored text matches', () => {
    const transaction = {
      id: 'tx-1',
      type: 'settlement',
      accountId: 'card-1',
      counterpartAccountId: 'bank-1',
      description: 'Settlement from Emily WS to Amex Cobalt',
      amount: 1976,
      date: '2026-06-04',
      accountName: 'Amex Cobalt',
      counterpartAccountName: 'Emily WS',
      categoryId: null,
      refundOf: null,
      incomeType: null,
      notes: null,
      tags: [],
      assignees: [],
    } as unknown as TransactionRow;

    const defaults = buildDefaultValues(transaction, accounts);
    expect(defaults.description).toBe(
      'Settlement from Emily WS to Amex Cobalt'
    );
    expect(
      formatGeneratedTransactionDescriptionFromAccounts(
        {
          type: defaults.type,
          accountId: defaults.accountId,
          counterpartAccountId: defaults.counterpartAccountId,
          refundOf: defaults.refundOf,
        },
        accounts
      )
    ).toBe(defaults.description);
  });

  it('keeps legacy settlement description in defaults when it differs from the template', () => {
    const transaction = {
      id: 'tx-1',
      type: 'settlement',
      accountId: 'card-1',
      counterpartAccountId: 'bank-1',
      description: 'Settlement: Amex Cobalt',
      amount: 1976,
      date: '2026-06-04',
      accountName: 'Amex Cobalt',
      counterpartAccountName: 'Emily WS',
      categoryId: null,
      refundOf: null,
      incomeType: null,
      notes: null,
      tags: [],
      assignees: [],
    } as unknown as TransactionRow;

    const defaults = buildDefaultValues(transaction, accounts);
    expect(defaults.description).toBe('Settlement: Amex Cobalt');
  });

  it('normalizes assignees with null percentage when amounts match lrmSplit', () => {
    const transaction = {
      id: 'tx-1',
      type: 'expense',
      accountId: 'card-1',
      counterpartAccountId: '',
      description: 'Coffee',
      amount: 1976,
      date: '2026-06-04',
      accountName: 'Amex Cobalt',
      counterpartAccountName: null,
      categoryId: null,
      refundOf: null,
      incomeType: null,
      notes: null,
      tags: [],
      assignees: [
        {
          transactionId: 'tx-1',
          memberId: 'member-emily',
          amountCents: 1976,
          percentage: null,
          firstName: 'Emily',
          lastName: null,
          email: 'Emily@example.com',
          imageUrl: null,
        },
      ],
    } as unknown as TransactionRow;

    const defaults = buildDefaultValues(transaction, accounts);
    expect(defaults.assignees).toEqual([
      { memberId: 'member-emily', amountCents: 1976, percentage: 100 },
    ]);
  });

  it('preserves a custom unlocked settlement description in defaults', () => {
    const transaction = {
      id: 'tx-1',
      type: 'settlement',
      accountId: 'card-1',
      counterpartAccountId: 'bank-1',
      description: 'June card payment',
      amount: 1976,
      date: '2026-06-04',
      accountName: 'Amex Cobalt',
      counterpartAccountName: 'Emily WS',
      categoryId: null,
      refundOf: null,
      incomeType: null,
      notes: null,
      tags: [],
      assignees: [],
    } as unknown as TransactionRow;

    const defaults = buildDefaultValues(transaction, accounts);
    expect(defaults.description).toBe('June card payment');
  });

  it('uses the generated transfer template when stored text matches', () => {
    const transaction = transactionStub({
      type: 'transfer',
      accountId: 'bank-1',
      counterpartAccountId: 'inv-1',
      description: 'Transfer from Emily WS to FHSA',
      accountName: 'Emily WS',
      counterpartAccountName: 'FHSA',
    });

    const defaults = buildDefaultValues(transaction, accounts);
    expect(defaults.description).toBe('Transfer from Emily WS to FHSA');
    expect(
      formatGeneratedTransactionDescriptionFromAccounts(
        {
          type: defaults.type,
          accountId: defaults.accountId,
          counterpartAccountId: defaults.counterpartAccountId,
          refundOf: defaults.refundOf,
        },
        accounts
      )
    ).toBe(defaults.description);
  });

  it('keeps a custom transfer description that does not match the template', () => {
    const defaults = buildDefaultValues(
      transactionStub({
        type: 'transfer',
        accountId: 'bank-1',
        counterpartAccountId: 'inv-1',
        description: 'Move rent to FHSA',
        accountName: 'Emily WS',
        counterpartAccountName: 'FHSA',
      }),
      accounts
    );
    expect(defaults.description).toBe('Move rent to FHSA');
  });

  it('uses the generated contribution template when stored text matches', () => {
    const defaults = buildDefaultValues(
      transactionStub({
        type: 'contribution',
        accountId: 'bank-1',
        counterpartAccountId: 'inv-1',
        description: 'Contribution from Emily WS to FHSA',
        accountName: 'Emily WS',
        counterpartAccountName: 'FHSA',
      }),
      accounts
    );
    expect(defaults.description).toBe('Contribution from Emily WS to FHSA');
  });

  it('keeps a custom contribution description that does not match the template', () => {
    const defaults = buildDefaultValues(
      transactionStub({
        type: 'contribution',
        accountId: 'bank-1',
        counterpartAccountId: 'inv-1',
        description: 'FHSA top-up',
        accountName: 'Emily WS',
        counterpartAccountName: 'FHSA',
      }),
      accounts
    );
    expect(defaults.description).toBe('FHSA top-up');
  });

  it('preserves a linked-refund description while the original is not yet loaded', () => {
    const defaults = buildDefaultValues(
      transactionStub({
        type: 'refund',
        accountId: 'card-1',
        description: 'Got money back',
        refundOf: 'tx-expense-1',
        accountName: 'Amex Cobalt',
      }),
      accounts
    );
    expect(defaults.description).toBe('Got money back');
  });

  it('keeps expense descriptions as stored manual text', () => {
    const defaults = buildDefaultValues(
      transactionStub({
        type: 'expense',
        accountId: 'card-1',
        description: 'Coffee',
        accountName: 'Amex Cobalt',
      }),
      accounts
    );
    expect(defaults.description).toBe('Coffee');
  });
});

describe('toApiPayload', () => {
  it('sends assignees as an empty array when there are no splits', () => {
    const payload = toApiPayload(baseForm());
    expect(payload.assignees).toEqual([]);
  });

  it('maps non-empty assignees including percentage', () => {
    const payload = toApiPayload({
      ...baseForm(),
      assignees: [
        {
          memberId: '00000000-0000-4000-8000-000000000002',
          amountCents: 1000,
          percentage: 100,
        },
      ],
    });
    expect(payload.assignees).toEqual([
      {
        memberId: '00000000-0000-4000-8000-000000000002',
        amountCents: 1000,
        percentage: 100,
      },
    ]);
  });
});
