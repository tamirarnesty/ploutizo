import { describe, expect, it } from 'vitest';
import type { Account } from '@ploutizo/types';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { formatGeneratedTransactionDescriptionFromAccounts } from '@ploutizo/utils/transaction-policy';
import { buildDefaultValues, toApiPayload } from './useTransactionForm';
import type { TransactionFormValues } from '../types';

const accounts: Account[] = [
  {
    id: 'card-1',
    orgId: 'org-1',
    name: 'Amex Cobalt',
    type: 'credit_card',
    institution: null,
    lastFour: null,
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
    institution: null,
    lastFour: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
  },
];

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
          memberName: 'Emily',
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
