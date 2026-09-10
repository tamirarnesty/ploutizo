import { describe, expect, it } from 'vitest';
import {
  buildTransactionQueryParams,
  validateTransactionSearch,
} from './transactionSearch';

describe('validateTransactionSearch', () => {
  it('returns an empty object when search is empty', () => {
    expect(validateTransactionSearch({})).toEqual({});
  });

  it('keeps valid pagination and sort params', () => {
    expect(
      validateTransactionSearch({ page: 2, sort: 'amount', order: 'asc' })
    ).toEqual({
      page: 2,
      sort: 'amount',
      order: 'asc',
    });
  });

  it('drops invalid pagination and sort params instead of injecting defaults', () => {
    expect(
      validateTransactionSearch({ page: 0, sort: 'invalid', order: 'bad' })
    ).toEqual({});
  });

  it('drops non-integer and non-numeric page values', () => {
    expect(validateTransactionSearch({ page: '2' })).toEqual({});
    expect(validateTransactionSearch({ page: 'abc' })).toEqual({});
    expect(validateTransactionSearch({ page: 1.5 })).toEqual({});
  });

  it('preserves filter and operator params', () => {
    expect(
      validateTransactionSearch({
        type: 'expense',
        accountId: 'abc',
        type_op: 'is_not',
        tagIds: 'uuid1,uuid2',
        tagIds_op: 'includes_all',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        dateRange_op: 'between',
      })
    ).toEqual({
      type: 'expense',
      accountId: 'abc',
      type_op: 'is_not',
      tagIds: 'uuid1,uuid2',
      tagIds_op: 'includes_all',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      dateRange_op: 'between',
    });
  });

  it('ignores unknown keys and non-string filter values', () => {
    expect(
      validateTransactionSearch({
        type: 123,
        extra: 'ignored',
        categoryId_op: 'empty',
      })
    ).toEqual({
      categoryId_op: 'empty',
    });
  });

  it('accepts all supported sort fields', () => {
    for (const sort of ['date', 'amount', 'type', 'category', 'account']) {
      expect(validateTransactionSearch({ sort })).toEqual({ sort });
    }
  });

  it('keeps matching import batch and outcome params together', () => {
    expect(
      validateTransactionSearch({
        importBatchId: 'batch_1',
        importOutcome: 'created',
      })
    ).toEqual({
      importBatchId: 'batch_1',
      importOutcome: 'created',
    });
    expect(
      validateTransactionSearch({
        importBatchId: 'batch_1',
        importOutcome: 'skipped',
      })
    ).toEqual({});
  });
});

describe('buildTransactionQueryParams', () => {
  it('applies defaults and maps import link fields', () => {
    expect(buildTransactionQueryParams({}, 25)).toEqual({
      page: 1,
      limit: 25,
      sort: 'date',
      order: 'desc',
      type: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      accountId: undefined,
      categoryId: undefined,
      assigneeId: undefined,
      tagIds: undefined,
      type_op: undefined,
      accountId_op: undefined,
      categoryId_op: undefined,
      assigneeId_op: undefined,
      tagIds_op: undefined,
      dateRange_op: undefined,
      importLink: undefined,
    });

    expect(
      buildTransactionQueryParams(
        {
          page: 2,
          sort: 'amount',
          order: 'asc',
          type: 'expense',
          importBatchId: 'batch_1',
          importOutcome: 'matched',
        },
        50
      )
    ).toEqual({
      page: 2,
      limit: 50,
      sort: 'amount',
      order: 'asc',
      type: 'expense',
      dateFrom: undefined,
      dateTo: undefined,
      accountId: undefined,
      categoryId: undefined,
      assigneeId: undefined,
      tagIds: undefined,
      type_op: undefined,
      accountId_op: undefined,
      categoryId_op: undefined,
      assigneeId_op: undefined,
      tagIds_op: undefined,
      dateRange_op: undefined,
      importLink: { batchId: 'batch_1', outcome: 'matched' },
    });
  });
});
