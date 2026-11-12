import { describe, expect, it } from 'vitest';
import { TRANSACTION_FILTERS } from './transactionFilterConfig';
import {
  buildCleanSearch,
  clearFilterPatch,
  hasActiveFilters,
  selectionPatch,
} from './transactionFilterUrl';

const filter = (field: string) => {
  const found = TRANSACTION_FILTERS.find((f) => f.field === field);
  if (!found) throw new Error(`No filter ${field}`);
  return found;
};

const importSearch = {
  importBatchId: 'batch_1',
  importOutcome: 'created' as const,
};

describe('buildCleanSearch', () => {
  it('strips params that match their defaults', () => {
    expect(
      buildCleanSearch({
        page: 1,
        sort: 'date',
        order: 'desc',
        search: '',
        type: '',
        dateRange_op: 'between',
      })
    ).toEqual({});
  });

  it('drops a date operator that has no dates to apply to', () => {
    expect(buildCleanSearch({ dateRange_op: 'after' })).toEqual({});
    expect(
      buildCleanSearch({ dateFrom: '2026-11-01', dateRange_op: 'after' })
    ).toEqual({ dateFrom: '2026-11-01', dateRange_op: 'after' });
  });

  it('keeps non-default sort, order and page', () => {
    expect(buildCleanSearch({ page: 2, sort: 'amount', order: 'asc' })).toEqual(
      { page: 2, sort: 'amount', order: 'asc' }
    );
  });
});

describe('selectionPatch', () => {
  it('comma-joins the selection and clears it when empty', () => {
    expect(selectionPatch('accountId', ['a', 'b'])).toEqual({
      accountId: 'a,b',
    });
    expect(selectionPatch('tagIds', [])).toEqual({ tagIds: undefined });
  });
});

describe('clearFilterPatch', () => {
  it('clears a selection filter through its own param', () => {
    expect(clearFilterPatch(filter('tag'))).toEqual({ tagIds: undefined });
    expect(clearFilterPatch(filter('account'))).toEqual({
      accountId: undefined,
    });
  });

  it('clears every date param together', () => {
    expect(clearFilterPatch(filter('date'))).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
      dateRange_op: undefined,
    });
  });

  it('drops the import batch along with the import result', () => {
    expect(
      buildCleanSearch({
        ...importSearch,
        type: 'expense',
        ...clearFilterPatch(filter('importResult')),
      })
    ).toEqual({ type: 'expense' });
  });
});

describe('hasActiveFilters', () => {
  it('counts the text search as narrowing the list', () => {
    expect(hasActiveFilters({ search: 'coffee' })).toBe(true);
  });

  it('counts each filter family', () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ tagIds: 'none' })).toBe(true);
    expect(hasActiveFilters({ dateTo: '2026-11-09' })).toBe(true);
  });

  it('treats a created or matched import constraint as active, a bare batch as not', () => {
    expect(hasActiveFilters(importSearch)).toBe(true);
    expect(hasActiveFilters({ importBatchId: 'batch_1' })).toBe(false);
  });
});
