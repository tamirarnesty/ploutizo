import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { NEW_TRANSACTION_SHORTCUT } from '@/pwa/pwa-brand';
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

  it('preserves filter-row search query', () => {
    expect(validateTransactionSearch({ search: 'groceries' })).toEqual({
      search: 'groceries',
    });
  });

  it('trims search and drops whitespace-only values', () => {
    expect(validateTransactionSearch({ search: '  groceries  ' })).toEqual({
      search: 'groceries',
    });
    expect(validateTransactionSearch({ search: '   ' })).toEqual({});
  });

  it('preserves filter params and drops legacy operator params', () => {
    expect(
      validateTransactionSearch({
        type: 'expense',
        accountId: 'abc',
        tagIds: 'uuid1,uuid2',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        dateRange_op: 'between',
      })
    ).toEqual({
      type: 'expense',
      accountId: 'abc',
      tagIds: 'uuid1,uuid2',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
  });

  it('drops blank and repeated values from list filters', () => {
    expect(
      validateTransactionSearch({
        accountId: ',a,,a,b,',
        categoryId: ',',
        tagIds: 'none,t1',
      })
    ).toEqual({ accountId: 'a,b', tagIds: 'none,t1' });
  });

  it('keeps only known transaction types', () => {
    expect(validateTransactionSearch({ type: 'expense,bogus,income' })).toEqual(
      {
        type: 'expense,income',
      }
    );
    expect(validateTransactionSearch({ type: 'bogus' })).toEqual({});
  });

  it('drops date params the filter cannot express', () => {
    expect(validateTransactionSearch({ dateFrom: '2026-01-01' })).toEqual({});
    expect(
      validateTransactionSearch({
        dateTo: '2026-01-31',
        dateRange_op: 'before',
      })
    ).toEqual({ dateTo: '2026-01-31', dateRange_op: 'before' });
    expect(
      validateTransactionSearch({ dateFrom: '2026-01-01', dateRange_op: 'is' })
    ).toEqual({ dateFrom: '2026-01-01', dateRange_op: 'is' });
    expect(
      validateTransactionSearch({
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        dateRange_op: 'bogus',
      })
    ).toEqual({});
  });

  it('ignores unknown keys and non-string filter values', () => {
    expect(
      validateTransactionSearch({
        type: 123,
        extra: 'ignored',
        categoryId_op: 'empty',
      })
    ).toEqual({});
  });

  it('accepts all supported sort fields', () => {
    for (const sort of ['date', 'amount', 'type', 'category', 'account']) {
      expect(validateTransactionSearch({ sort })).toEqual({ sort });
    }
  });

  it('keeps the new-transaction shortcut and drops other create values', () => {
    const shortcutSearch = defaultParseSearch(
      new URL(NEW_TRANSACTION_SHORTCUT.url, 'https://ploutizo.invalid').search
    );
    expect(validateTransactionSearch(shortcutSearch)).toEqual({
      create: true,
    });
    expect(validateTransactionSearch({ create: true, page: 2 })).toEqual({
      create: true,
      page: 2,
    });
    expect(validateTransactionSearch({ create: false })).toEqual({});
    expect(validateTransactionSearch({ create: 'true' })).toEqual({});
    expect(validateTransactionSearch({ create: 1 })).toEqual({});
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
  it('leaves the new-transaction shortcut out of the list query', () => {
    expect(
      buildTransactionQueryParams({ create: true }, 25)
    ).not.toHaveProperty('create');
  });

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
      dateRange_op: undefined,
      importLink: { batchId: 'batch_1', outcome: 'matched' },
    });
  });
});
