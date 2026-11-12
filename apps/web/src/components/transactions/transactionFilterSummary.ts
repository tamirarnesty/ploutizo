import type { ActiveFilterChip } from '@ploutizo/ui/components/active-filter-chips';
import {
  dateFilterFromSearch,
  formatTransactionDateFilterLabel,
} from './transactionDateFilter';
import { TRANSACTION_FILTERS } from './transactionFilterConfig';
import type { TransactionFilterField } from './transactionFilterConfig';
import type { TransactionSearch } from './transactionSearch';
import type {
  SelectionFilterState,
  TransactionFilterOptions,
} from './transactionFilterTypes';

export const summarizeSelection = (
  values: string[],
  labels: SelectionFilterState['labels'],
  allLabel: string
): string =>
  values.length === 0
    ? allLabel
    : values.map((value) => labels.get(value) ?? value).join(', ');

export type TransactionFilterChip = ActiveFilterChip<TransactionFilterField>;

export const buildTransactionFilterChips = (
  search: TransactionSearch,
  options: TransactionFilterOptions,
  today: Date
): TransactionFilterChip[] =>
  TRANSACTION_FILTERS.flatMap((filter): TransactionFilterChip[] => {
    const chip = (summary: string): TransactionFilterChip[] => [
      { id: filter.field, label: filter.label, summary },
    ];
    switch (filter.kind) {
      case 'selection': {
        const { values, labels } = options.selections[filter.field];
        return values.length > 0
          ? chip(summarizeSelection(values, labels, filter.allLabel))
          : [];
      }
      case 'date': {
        const dateFilter = dateFilterFromSearch(search);
        return dateFilter
          ? chip(formatTransactionDateFilterLabel(dateFilter, today))
          : [];
      }
      case 'importResult': {
        const selected = options.importOptions.find(
          (option) => option.value === options.importValue
        );
        return search.importBatchId && selected ? chip(selected.label) : [];
      }
    }
  });
