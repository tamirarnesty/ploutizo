import { describe, expect, it } from 'vitest';
import {
  buildTransactionFilterChips,
  summarizeSelection,
} from './transactionFilterSummary';
import type {
  SelectionFilterState,
  TransactionFilterOptions,
} from './transactionFilterTypes';

const TODAY = new Date(2026, 10, 9);

const selection = (
  values: string[],
  labels: [string, string][] = []
): SelectionFilterState => ({
  values,
  groups: [],
  labels: new Map(labels),
});

const options = (
  overrides: Partial<TransactionFilterOptions['selections']> = {},
  importValue: TransactionFilterOptions['importValue'] = undefined
): TransactionFilterOptions => ({
  selections: {
    type: selection([]),
    account: selection([]),
    assignee: selection([]),
    category: selection([]),
    tag: selection([]),
    ...overrides,
  },
  importOptions: [{ value: 'created', label: 'Created' }],
  importValue,
});

describe('summarizeSelection', () => {
  it('falls back to the all label when nothing is selected', () => {
    expect(summarizeSelection([], new Map(), 'All tags')).toBe('All tags');
  });

  it('joins the labels of the selected values', () => {
    const labels = new Map([
      ['mem_1', 'Ada'],
      ['shared', 'Shared'],
    ]);
    expect(summarizeSelection(['mem_1', 'shared'], labels, 'All')).toBe(
      'Ada, Shared'
    );
  });
});

describe('buildTransactionFilterChips', () => {
  it('emits no chips when nothing is applied', () => {
    expect(buildTransactionFilterChips({}, options(), TODAY)).toEqual([]);
  });

  it('emits one chip per applied filter in display order', () => {
    const chips = buildTransactionFilterChips(
      { dateFrom: '2026-11-01', dateTo: '2026-11-30' },
      options({
        tag: selection(['t1'], [['t1', 'Travel']]),
        type: selection(['expense'], [['expense', 'Expense']]),
      }),
      TODAY
    );
    expect(chips).toEqual([
      { id: 'type', label: 'Type', summary: 'Expense' },
      { id: 'date', label: 'Date', summary: 'This month' },
      { id: 'tag', label: 'Tags', summary: 'Travel' },
    ]);
  });

  it('shows the import result only while its batch is present', () => {
    const importOptions = options({}, 'created');
    expect(buildTransactionFilterChips({}, importOptions, TODAY)).toEqual([]);
    expect(
      buildTransactionFilterChips(
        { importBatchId: 'batch_1', importOutcome: 'created' },
        importOptions,
        TODAY
      )
    ).toEqual([
      { id: 'importResult', label: 'Import result', summary: 'Created' },
    ]);
  });
});
