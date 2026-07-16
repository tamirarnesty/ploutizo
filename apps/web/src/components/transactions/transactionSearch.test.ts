import { describe, expect, it } from 'vitest';
import { validateTransactionSearch } from './transactionSearch';

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
});
