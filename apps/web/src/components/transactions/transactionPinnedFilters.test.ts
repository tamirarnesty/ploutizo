import { describe, expect, it } from 'vitest';
import {
  TRANSACTION_PINNED_FILTER_FIELD_KEYS,
  activeTransactionFiltersForSearch,
  createEmptyPinnedTransactionFilter,
  transactionPinnedFilterId,
  withPinnedTransactionFilters,
} from './transactionPinnedFilters';
import { buildFilterFields } from './TransactionFilterFields';
import { filtersToSearch } from './Transactions';

describe('transaction pinned filters', () => {
  it('uses stable ids for pinned fields', () => {
    expect(transactionPinnedFilterId('type')).toBe('filter-type');
    expect(transactionPinnedFilterId('dateRange')).toBe('filter-dateRange');
  });

  it('pins type, date, account, and category only', () => {
    expect([...TRANSACTION_PINNED_FILTER_FIELD_KEYS]).toEqual([
      'type',
      'dateRange',
      'accountId',
      'categoryId',
    ]);
  });

  it('pads inactive pinned filters without affecting URL search mapping', () => {
    const padded = withPinnedTransactionFilters([]);
    expect(padded).toHaveLength(4);
    expect(filtersToSearch(activeTransactionFiltersForSearch(padded))).toEqual(
      {}
    );
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
    expect(filtersToSearch(activeTransactionFiltersForSearch(padded))).toEqual({
      type: 'expense',
    });
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
