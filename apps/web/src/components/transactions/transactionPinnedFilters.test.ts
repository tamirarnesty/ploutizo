import { describe, expect, it } from 'vitest';
import { isFilterValueActive } from '@ploutizo/ui/components/reui/filters';
import {
  TRANSACTION_PINNED_FILTER_FIELD_KEYS,
  withPinnedTransactionFilters,
} from './transactionPinnedFilters';
import { buildFilterFields } from './TransactionFilterFields';
import { filtersToSearch, searchToFilters } from './Transactions';

const activeForSearch = (
  filters: ReturnType<typeof withPinnedTransactionFilters>
) => filters.filter(isFilterValueActive);

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
