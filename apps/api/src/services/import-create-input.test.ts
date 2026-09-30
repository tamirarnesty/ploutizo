import { describe, expect, it } from 'vitest';
import type { ImportRowProjection } from '@ploutizo/utils/import-set-verification';
import type { ImportRowSnapshot, ReviewedImportValues } from '@ploutizo/types';
import { DomainError } from '@/lib/errors';
import {
  prepareImportTransactionCreates,
  toImportCreateTransactionInput,
} from '@/services/import-create-input';

const ACCOUNT = '550e8400-e29b-41d4-a716-446655440010';
const BATCH = '550e8400-e29b-41d4-a716-446655440040';
const MEMBER = '550e8400-e29b-41d4-a716-446655440020';
const CATEGORY = '550e8400-e29b-41d4-a716-446655440030';
const FUNDING = '550e8400-e29b-41d4-a716-446655440011';
const EXPENSE = '550e8400-e29b-41d4-a716-446655440070';

const snapshot = (
  overrides: Partial<ReviewedImportValues> = {}
): ImportRowSnapshot => ({
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

  it('fails closed when settlement counterpart is missing', () => {
    const err = (() => {
      try {
        toImportCreateTransactionInput({
          accountId: ACCOUNT,
          batchId: BATCH,
          snapshot: snapshot({
            type: 'settlement',
            counterpartAccountId: null,
            categoryId: null,
          }),
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

describe('prepareImportTransactionCreates', () => {
  const ORG = 'org_a';
  const draft = { id: BATCH, accountId: ACCOUNT };
  const created = (batchRowId: string, values = {}): ImportRowProjection => ({
    batchRowId,
    outcome: 'created',
    transactionId: null,
    snapshot: snapshot(values),
  });

  it('assigns app ids, resolves same-batch refunds, and links created and matched rows', () => {
    const prepared = prepareImportTransactionCreates({
      orgId: ORG,
      draft,
      projection: [
        created('row-refund', {
          type: 'refund',
          amount: 400,
          refundOfBatchRowId: 'row-expense',
        }),
        created('row-expense'),
        {
          batchRowId: 'row-matched',
          outcome: 'matched',
          transactionId: EXPENSE,
          snapshot: snapshot(),
        },
        created('row-matched-refund', {
          type: 'refund',
          amount: 400,
          refundOfBatchRowId: 'row-matched',
        }),
        {
          batchRowId: 'row-skipped',
          outcome: 'skipped',
          transactionId: null,
          snapshot: snapshot(),
        },
      ],
    });

    const [refund, expense, matchedRefund] = prepared.items;
    expect(expense.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(refund.input).toMatchObject({
      type: 'refund',
      refundOf: expense.id,
    });
    expect(matchedRefund.input).toMatchObject({
      type: 'refund',
      refundOf: EXPENSE,
    });
    expect(prepared.links).toEqual([
      {
        orgId: ORG,
        batchId: BATCH,
        batchRowId: 'row-refund',
        transactionId: refund.id,
        outcome: 'created',
      },
      {
        orgId: ORG,
        batchId: BATCH,
        batchRowId: 'row-expense',
        transactionId: expense.id,
        outcome: 'created',
      },
      {
        orgId: ORG,
        batchId: BATCH,
        batchRowId: 'row-matched',
        transactionId: EXPENSE,
        outcome: 'matched',
      },
      {
        orgId: ORG,
        batchId: BATCH,
        batchRowId: 'row-matched-refund',
        transactionId: matchedRefund.id,
        outcome: 'created',
      },
    ]);
  });

  it('throws when a same-batch refund target is not finalized', () => {
    const prepare = () =>
      prepareImportTransactionCreates({
        orgId: ORG,
        draft,
        projection: [
          created('row-refund', {
            type: 'refund',
            amount: 400,
            refundOfBatchRowId: 'row-skipped',
          }),
          {
            batchRowId: 'row-skipped',
            outcome: 'skipped',
            transactionId: null,
            snapshot: snapshot(),
          },
        ],
      });

    expect(prepare).toThrow(DomainError);
    expect(prepare).toThrow(
      'Created import refund is linked to a row that is not finalized.'
    );
  });
});
