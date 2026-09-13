import { describe, expect, it } from 'vitest';
import type {
  PreparedImportRowSnapshot,
  ReviewedImportValues,
} from '@ploutizo/types';
import { DomainError } from '@/lib/errors';
import { toImportCreateTransactionInput } from '@/services/import-create-input';

const ACCOUNT = '550e8400-e29b-41d4-a716-446655440010';
const BATCH = '550e8400-e29b-41d4-a716-446655440040';
const MEMBER = '550e8400-e29b-41d4-a716-446655440020';
const CATEGORY = '550e8400-e29b-41d4-a716-446655440030';
const FUNDING = '550e8400-e29b-41d4-a716-446655440011';
const EXPENSE = '550e8400-e29b-41d4-a716-446655440070';

const snapshot = (
  overrides: Partial<ReviewedImportValues> = {}
): PreparedImportRowSnapshot => ({
  reviewedValues: {
    date: '2026-05-02',
    amount: 4218,
    type: 'expense',
    description: 'Neighborhood Coffee',
    categoryId: CATEGORY,
    assigneeMemberIds: [MEMBER],
    counterpartAccountId: null,
    refundOf: null,
    refundOfBatchRowId: null,
    notes: null,
    tagIds: [],
    ...overrides,
  },
  provenance: {
    externalId: 'visa-created',
    rawDescription: 'COFFEE SHOP #42',
    parsedDescription: 'Coffee Shop',
  },
});

describe('toImportCreateTransactionInput', () => {
  it('projects an expense onto the create transaction contract', () => {
    expect(
      toImportCreateTransactionInput({
        accountId: ACCOUNT,
        batchId: BATCH,
        snapshot: snapshot(),
        refundOf: null,
      })
    ).toMatchObject({
      type: 'expense',
      accountId: ACCOUNT,
      importBatchId: BATCH,
      categoryId: CATEGORY,
      externalId: 'visa-created',
      rawDescription: 'COFFEE SHOP #42',
    });
  });

  it('includes resolved refundOf on refund creates', () => {
    expect(
      toImportCreateTransactionInput({
        accountId: ACCOUNT,
        batchId: BATCH,
        snapshot: snapshot({ type: 'refund', amount: 1000 }),
        refundOf: EXPENSE,
      })
    ).toMatchObject({
      type: 'refund',
      refundOf: EXPENSE,
      categoryId: CATEGORY,
    });
  });

  it('omits a null settlement counterpart so the create schema can parse', () => {
    const input = toImportCreateTransactionInput({
      accountId: ACCOUNT,
      batchId: BATCH,
      snapshot: snapshot({
        type: 'settlement',
        counterpartAccountId: null,
        categoryId: null,
      }),
      refundOf: null,
    });
    expect(input).toMatchObject({
      type: 'settlement',
      accountId: ACCOUNT,
    });
    expect(input).not.toHaveProperty('counterpartAccountId');
  });

  it('projects a settlement with a funding account', () => {
    expect(
      toImportCreateTransactionInput({
        accountId: ACCOUNT,
        batchId: BATCH,
        snapshot: snapshot({
          type: 'settlement',
          counterpartAccountId: FUNDING,
          categoryId: null,
        }),
        refundOf: null,
      })
    ).toMatchObject({
      type: 'settlement',
      counterpartAccountId: FUNDING,
    });
  });

  it('fails closed when required create fields are missing', () => {
    const err = (() => {
      try {
        toImportCreateTransactionInput({
          accountId: ACCOUNT,
          batchId: BATCH,
          snapshot: snapshot({ categoryId: null }),
          refundOf: null,
        });
      } catch (error) {
        return error;
      }
      return null;
    })();

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({ statusCode: 500 });
  });
});
