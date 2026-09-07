import { describe, expect, it } from 'vitest';
import { buildFilterFields } from './TransactionFilterFields';
import {
  buildCleanSearch,
  filtersToSearch,
  hasActiveFilters,
  searchToFilters,
} from './Transactions';

const importSearch = {
  importBatchId: 'batch_1',
  importOutcome: 'created' as const,
};

const applyFilters = (
  prev: {
    importBatchId?: string;
    importOutcome?: 'created' | 'matched';
    sort?: 'date';
  },
  filters: ReturnType<typeof searchToFilters>
) => {
  const mapped = filtersToSearch(filters);
  return buildCleanSearch({
    page: 1,
    sort: prev.sort,
    ...mapped,
    importBatchId: mapped.importOutcome ? prev.importBatchId : undefined,
  });
};

describe('import result filters', () => {
  it('treats a created or matched import constraint as an active filter', () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters(importSearch)).toBe(true);
    expect(hasActiveFilters({ importBatchId: 'batch_1' })).toBe(false);
  });

  it('exposes the import result as a visible filter chip', () => {
    expect(searchToFilters(importSearch)).toEqual([
      {
        id: 'filter-importOutcome',
        field: 'importOutcome',
        operator: 'is',
        values: ['created'],
      },
    ]);
  });

  it('clears the import constraint when the chip is removed', () => {
    expect(applyFilters(importSearch, [])).toEqual({});
    expect(
      applyFilters(importSearch, [
        {
          id: 'filter-type',
          field: 'type',
          operator: 'is',
          values: ['expense'],
        },
      ])
    ).toEqual({ type: 'expense' });
  });

  it('keeps the import batch when the outcome chip stays selected', () => {
    expect(
      applyFilters(importSearch, [
        {
          id: 'filter-importOutcome',
          field: 'importOutcome',
          operator: 'is',
          values: ['matched'],
        },
      ])
    ).toEqual({
      importBatchId: 'batch_1',
      importOutcome: 'matched',
    });
  });

  it('offers Import result only when a provenance batch is present', () => {
    const withoutBatch = buildFilterFields([], [], [], []);
    expect(withoutBatch.some((field) => field.key === 'importOutcome')).toBe(
      false
    );

    const withBatch = buildFilterFields([], [], [], [], {
      includeImportResult: true,
    });
    const importField = withBatch.find(
      (field) => field.key === 'importOutcome'
    );
    expect(importField?.label).toBe('Import result');
    expect(importField?.options).toEqual([
      { value: 'created', label: 'Created' },
      { value: 'matched', label: 'Matched' },
    ]);
  });
});
