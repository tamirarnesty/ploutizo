import { describe, expect, it } from 'vitest';
import { buildFilterFields } from './TransactionFilterFields';
import {
  buildCleanSearch,
  filtersToSearch,
  hasActiveFilters,
  searchToFilters,
} from './transactionFilterUrl';

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

describe('text search', () => {
  it('counts a search query as an active filter', () => {
    expect(hasActiveFilters({ search: 'coffee' })).toBe(true);
  });

  it('strips an empty search param from cleaned URL state', () => {
    expect(buildCleanSearch({ search: '' })).toEqual({});
    expect(buildCleanSearch({ search: 'coffee' })).toEqual({
      search: 'coffee',
    });
  });
});

describe('multi-value filters', () => {
  it('round-trips comma-joined values for every option filter', () => {
    const search = {
      type: 'expense,income',
      accountId: 'acc_1,acc_2',
      categoryId: 'cat_1,cat_2',
      assigneeId: 'mem_1,mem_2',
      tagIds: 'tag_1,tag_2',
    };
    const filters = searchToFilters(search);
    expect(filters).toEqual([
      {
        id: 'filter-type',
        field: 'type',
        operator: 'is',
        values: ['expense', 'income'],
      },
      {
        id: 'filter-categoryId',
        field: 'categoryId',
        operator: 'is',
        values: ['cat_1', 'cat_2'],
      },
      {
        id: 'filter-assigneeId',
        field: 'assigneeId',
        operator: 'is',
        values: ['mem_1', 'mem_2'],
      },
      {
        id: 'filter-accountId',
        field: 'accountId',
        operator: 'is',
        values: ['acc_1', 'acc_2'],
      },
      {
        id: 'filter-tagIds',
        field: 'tagIds',
        operator: 'is',
        values: ['tag_1', 'tag_2'],
      },
    ]);
    expect(filtersToSearch(filters)).toEqual(search);
  });

  it('round-trips assignee shape sentinels alongside member ids', () => {
    const filters = searchToFilters({ assigneeId: 'mem_1,shared' });
    expect(filters).toEqual([
      {
        id: 'filter-assigneeId',
        field: 'assigneeId',
        operator: 'is',
        values: ['mem_1', 'shared'],
      },
    ]);
    expect(filtersToSearch(filters)).toEqual({ assigneeId: 'mem_1,shared' });
  });
  it('offers assignee shape sentinels alongside member options', () => {
    const member = {
      id: 'mem_1',
      firstName: 'Ada',
      lastName: null,
      email: 'ada@example.com',
    };
    const assigneeField = buildFilterFields([], [], [member], []).find(
      (field) => field.key === 'assigneeId'
    );
    expect(assigneeField?.options?.map((o) => o.value)).toEqual([
      'mem_1',
      'personal',
      'shared',
    ]);
  });
});

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
