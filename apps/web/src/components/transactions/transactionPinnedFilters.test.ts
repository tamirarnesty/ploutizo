import { describe, expect, it } from 'vitest';
import {
  TRANSACTION_PINNED_FILTER_FIELD_KEYS,
  withPinnedTransactionFilters,
} from './transactionPinnedFilters';
import { buildFilterFields } from './TransactionFilterFields';
import {
  filtersToSearch,
  searchToFilters,
  shouldPersistTransactionFilter,
} from './transactionFilterUrl';

const activeForSearch = (
  filters: ReturnType<typeof withPinnedTransactionFilters>
) => filters.filter(shouldPersistTransactionFilter);

describe('transaction pinned filters', () => {
  it('pads inactive pinned filters without affecting URL search mapping', () => {
    const padded = withPinnedTransactionFilters([]);
    expect(padded).toHaveLength(TRANSACTION_PINNED_FILTER_FIELD_KEYS.length);
    expect(filtersToSearch(activeForSearch(padded))).toEqual({});
  });

  it('keeps active pinned filters in URL mapping', () => {
    const padded = withPinnedTransactionFilters([
      {
        id: 'filter-type',
        field: 'type',
        operator: 'is',
        values: ['expense'],
      },
    ]);
    expect(filtersToSearch(activeForSearch(padded))).toEqual({
      type: 'expense',
    });
  });

  it('persists non-default operators on empty pinned filters', () => {
    const padded = withPinnedTransactionFilters([
      {
        id: 'filter-type',
        field: 'type',
        operator: 'is_not',
        values: [],
      },
      {
        id: 'filter-dateRange',
        field: 'dateRange',
        operator: 'after',
        values: [],
      },
    ]);
    expect(filtersToSearch(activeForSearch(padded))).toEqual({
      type_op: 'is_not',
      dateRange_op: 'after',
    });
    expect(
      withPinnedTransactionFilters(
        searchToFilters({
          type_op: 'is_not',
          dateRange_op: 'after',
        })
      )
    ).toEqual([
      {
        id: 'filter-type',
        field: 'type',
        operator: 'is_not',
        values: [],
      },
      {
        id: 'filter-dateRange',
        field: 'dateRange',
        operator: 'after',
        values: [],
      },
      {
        id: 'filter-accountId',
        field: 'accountId',
        operator: 'is',
        values: [],
      },
      {
        id: 'filter-categoryId',
        field: 'categoryId',
        operator: 'is',
        values: [],
      },
    ]);
  });

  it('maps pinned date range between to URL params', () => {
    const padded = withPinnedTransactionFilters([
      {
        id: 'filter-dateRange',
        field: 'dateRange',
        operator: 'between',
        values: ['2026-01-01', '2026-01-31'],
      },
    ]);
    expect(filtersToSearch(activeForSearch(padded))).toEqual({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
  });

  it('persists is_not on empty category pinned filter', () => {
    const padded = withPinnedTransactionFilters([
      {
        id: 'filter-categoryId',
        field: 'categoryId',
        operator: 'is_not',
        values: [],
      },
    ]);
    expect(filtersToSearch(activeForSearch(padded))).toEqual({
      categoryId_op: 'is_not',
    });
    expect(
      searchToFilters({
        categoryId_op: 'is_not',
      })
    ).toEqual([
      {
        id: 'filter-categoryId',
        field: 'categoryId',
        operator: 'is_not',
        values: [],
      },
    ]);
  });

  it('maps pinned category empty operator without a category id', () => {
    const padded = withPinnedTransactionFilters([
      {
        id: 'filter-categoryId',
        field: 'categoryId',
        operator: 'empty',
        values: [],
      },
    ]);
    expect(filtersToSearch(activeForSearch(padded))).toEqual({
      categoryId_op: 'empty',
    });
  });

  it('restores pinned filters from URL search including category empty', () => {
    expect(
      withPinnedTransactionFilters(
        searchToFilters({
          dateFrom: '2026-02-01',
          dateTo: '2026-02-28',
          categoryId_op: 'empty',
        })
      )
    ).toEqual([
      {
        id: 'filter-type',
        field: 'type',
        operator: 'is',
        values: [],
      },
      {
        id: 'filter-dateRange',
        field: 'dateRange',
        operator: 'between',
        values: ['2026-02-01', '2026-02-28'],
      },
      {
        id: 'filter-accountId',
        field: 'accountId',
        operator: 'is',
        values: [],
      },
      {
        id: 'filter-categoryId',
        field: 'categoryId',
        operator: 'empty',
        values: [],
      },
    ]);
  });

  it('keeps assignee, tags, and import result in the add-filter field list', () => {
    const allFields = buildFilterFields([], [], [], [], {
      includeImportResult: true,
    });
    const keys = allFields.map((field) => field.key);
    expect(keys).toEqual([
      'type',
      'dateRange',
      'accountId',
      'categoryId',
      'assigneeId',
      'tagIds',
      'importOutcome',
    ]);
    for (const pinned of TRANSACTION_PINNED_FILTER_FIELD_KEYS) {
      expect(keys).toContain(pinned);
    }
  });
});
