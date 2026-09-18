import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveTransactionDescriptionLock,
  resolveTransactionDescriptionPolicy,
} from '@ploutizo/utils/transaction-policy';
import type * as TransactionPolicyModule from '@ploutizo/utils/transaction-policy';
import type { Account } from '@ploutizo/types';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { resolveTransactionFormDescriptionLock } from './getTransactionFormDescriptionLock';
import { buildDefaultValues } from './hooks/useTransactionForm';

vi.mock('@ploutizo/utils/transaction-policy', async (importOriginal) => {
  const actual = await importOriginal<typeof TransactionPolicyModule>();
  return {
    ...actual,
    resolveTransactionDescriptionPolicy: vi.fn(
      actual.resolveTransactionDescriptionPolicy
    ),
    resolveTransactionDescriptionLock: vi.fn(
      actual.resolveTransactionDescriptionLock
    ),
  };
});

const policyMock = vi.mocked(resolveTransactionDescriptionPolicy);
const lockMock = vi.mocked(resolveTransactionDescriptionLock);

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

const generatedCases = [
  {
    name: 'transfer',
    transaction: transactionStub({
      type: 'transfer',
      accountId: 'bank-1',
      counterpartAccountId: 'inv-1',
      description: 'Transfer from Emily WS to FHSA',
      accountName: 'Emily WS',
      counterpartAccountName: 'FHSA',
    }),
    refundOf: '',
  },
  {
    name: 'settlement',
    transaction: transactionStub({
      type: 'settlement',
      accountId: 'card-1',
      counterpartAccountId: 'bank-1',
      description: 'Settlement from Emily WS to Amex Cobalt',
      accountName: 'Amex Cobalt',
      counterpartAccountName: 'Emily WS',
    }),
    refundOf: '',
  },
  {
    name: 'contribution',
    transaction: transactionStub({
      type: 'contribution',
      accountId: 'bank-1',
      counterpartAccountId: 'inv-1',
      description: 'Contribution from Emily WS to FHSA',
      accountName: 'Emily WS',
      counterpartAccountName: 'FHSA',
    }),
    refundOf: '',
  },
  {
    name: 'linked-refund',
    transaction: transactionStub({
      type: 'refund',
      accountId: 'card-1',
      description: 'Got money back',
      refundOf: 'tx-expense-1',
      accountName: 'Amex Cobalt',
    }),
    refundOf: 'tx-expense-1',
  },
] as const;

beforeEach(() => {
  policyMock.mockClear();
  lockMock.mockClear();
});

describe('resolveTransactionFormDescriptionLock', () => {
  it.each(generatedCases)(
    'calls policy then lock for $name',
    ({ transaction, refundOf }) => {
      const generatedCandidate = 'generated-candidate';
      const result = resolveTransactionFormDescriptionLock({
        type: transaction.type,
        refundOf,
        currentDescription: transaction.description,
        generatedCandidate,
      });

      expect(policyMock).toHaveBeenCalledTimes(1);
      expect(policyMock).toHaveBeenCalledWith({
        type: transaction.type,
        refundOf,
      });
      expect(lockMock).toHaveBeenCalledTimes(1);
      expect(lockMock).toHaveBeenCalledWith({
        type: transaction.type,
        refundOf,
        currentDescription: transaction.description,
        generatedCandidate,
      });
      expect(result.shouldLock).toBe(
        policyMock.mock.results[0]?.value.mode === 'generated'
      );
      expect(result.description).toBe(
        lockMock.mock.results[0]?.value.description
      );
    }
  );
});

describe('buildDefaultValues description lock path', () => {
  it.each(generatedCases)(
    'invokes both helpers when building $name defaults',
    ({ transaction, refundOf }) => {
      buildDefaultValues(transaction, accounts);

      expect(policyMock).toHaveBeenCalledWith({
        type: transaction.type,
        refundOf,
      });
      expect(lockMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: transaction.type,
          refundOf,
          currentDescription: transaction.description,
        })
      );
    }
  );

  it('uses the lock helper description instead of ad-hoc copy', () => {
    lockMock.mockReturnValueOnce({
      policyMode: 'generated',
      userUnlocked: false,
      locked: true,
      description: 'MOCK-LOCKED-TRANSFER',
    });

    const defaults = buildDefaultValues(
      transactionStub({
        type: 'transfer',
        accountId: 'bank-1',
        counterpartAccountId: 'inv-1',
        description: 'Transfer from Emily WS to FHSA',
        accountName: 'Emily WS',
        counterpartAccountName: 'FHSA',
      }),
      accounts
    );

    expect(policyMock).toHaveBeenCalled();
    expect(lockMock).toHaveBeenCalled();
    expect(defaults.description).toBe('MOCK-LOCKED-TRANSFER');
  });
});
