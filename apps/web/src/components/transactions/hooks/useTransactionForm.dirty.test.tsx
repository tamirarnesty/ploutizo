import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { lrmSplit } from '@ploutizo/utils';
import { formatGeneratedTransactionDescriptionFromAccounts } from '@ploutizo/utils/transaction-policy';
import type { Account } from '@ploutizo/types';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { buildDefaultValues, useTransactionForm } from './useTransactionForm';

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

const settlementTransaction = (): TransactionRow =>
  ({
    id: 'tx-settlement-1',
    orgId: 'org-1',
    type: 'settlement',
    amount: 1976,
    date: '2026-06-04',
    description: 'Settlement from Emily WS to Amex Cobalt',
    categoryId: null,
    categoryName: null,
    categoryIcon: null,
    categoryColour: null,
    accountId: 'card-1',
    accountName: 'Amex Cobalt',
    accountType: 'credit_card',
    refundOf: null,
    incomeType: null,
    counterpartAccountId: 'bank-1',
    counterpartAccountName: 'Emily WS',
    rawDescription: null,
    notes: 'pay bill',
    refundOfId: null,
    refundOfDate: null,
    refundOfAmountCents: null,
    importBatchId: null,
    recurringTemplateId: null,
    deletedAt: null,
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
    assignees: [
      {
        transactionId: 'tx-settlement-1',
        memberId: 'member-emily',
        amountCents: 1976,
        percentage: '100',
        memberName: 'Emily Gauvreau',
        imageUrl: null,
      },
    ],
    tags: [],
  }) as TransactionRow;

const createMutation = () => ({ mutate: vi.fn(), isPending: false });
const updateMutation = () => ({ mutate: vi.fn(), isPending: false });

describe('useTransactionForm pristine state on edit mount', () => {
  it('stays at default values for a settlement after locked-description sync', async () => {
    const transaction = settlementTransaction();
    const { result } = renderHook(() =>
      useTransactionForm({
        transaction,
        accounts,
        onClose: vi.fn(),
        createMutation: createMutation() as never,
        updateMutation: updateMutation() as never,
      })
    );

    const locked = formatGeneratedTransactionDescriptionFromAccounts(
      {
        type: 'settlement',
        accountId: 'card-1',
        counterpartAccountId: 'bank-1',
        refundOf: '',
        accountName: 'Amex Cobalt',
        counterpartAccountName: 'Emily WS',
      },
      accounts
    );

    await act(async () => {
      const field = result.current.form.getFieldInfo('description');
      if (locked && result.current.form.state.values.description !== locked) {
        result.current.form.setFieldValue('description', locked);
      }
    });

    await waitFor(() => {
      expect(result.current.form.state.isDefaultValue).toBe(true);
    });
    expect(result.current.form.state.isDirty).toBe(false);
  });

  it('stays pristine when assignees are re-synced via lrmSplit on mount', async () => {
    const transaction = settlementTransaction();
    const { result } = renderHook(() =>
      useTransactionForm({
        transaction,
        accounts,
        onClose: vi.fn(),
        createMutation: createMutation() as never,
        updateMutation: updateMutation() as never,
      })
    );

    const split = lrmSplit(1976, ['member-emily']);

    await act(async () => {
      result.current.form.setFieldValue('assignees', split);
    });

    await waitFor(() => {
      expect(result.current.form.state.isDefaultValue).toBe(true);
    });
  });

  it('buildDefaultValues matches locked template for settlement', () => {
    const defaults = buildDefaultValues(settlementTransaction(), accounts);
    const locked = formatGeneratedTransactionDescriptionFromAccounts(
      {
        type: defaults.type,
        accountId: defaults.accountId,
        counterpartAccountId: defaults.counterpartAccountId,
        refundOf: defaults.refundOf,
        accountName: 'Amex Cobalt',
        counterpartAccountName: 'Emily WS',
      },
      accounts
    );
    expect(defaults.description).toBe(locked);
  });
});
