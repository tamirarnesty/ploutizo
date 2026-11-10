import {
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
} from 'date-fns';
import type {
  DateSelectorFilterType,
  DateSelectorValue,
} from '@ploutizo/ui/components/date-selector';
import type { TransactionSearch } from './transactionSearch';

/**
 * Date filter state shared by the quick-filter popover, the Filters panel
 * section, and the applied-filter chips. `values` mirrors the URL codec:
 * single-bound operators carry one `yyyy-MM-dd` value; range operators carry
 * `[from, to]` (either side may be an empty string while partial).
 */
export type TransactionDateFilterValue = {
  operator: string;
  values: string[];
};

export const TRANSACTION_DATE_OPERATORS = [
  { value: 'is', label: 'Is' },
  { value: 'is_not', label: 'Is not' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
  { value: 'not_between', label: 'Not between' },
] as const;

const RANGE_OPERATORS = new Set(['between', 'not_between']);

export const isRangeDateOperator = (operator: string): boolean =>
  RANGE_OPERATORS.has(operator);

const toFilterValue = (date: Date) => format(date, 'yyyy-MM-dd');

const parseFilterDate = (value: string): Date | undefined => {
  const date = parseISO(value);
  return value && isValid(date) ? date : undefined;
};

/** Maps URL search params to editor state — inverse of `dateFilterToSearch`. */
export const dateFilterFromSearch = (
  search: TransactionSearch
): TransactionDateFilterValue => {
  const operator = search.dateRange_op ?? 'between';
  if (operator === 'after') {
    return { operator, values: search.dateFrom ? [search.dateFrom] : [] };
  }
  if (operator === 'before') {
    return { operator, values: search.dateTo ? [search.dateTo] : [] };
  }
  if (operator === 'is' || operator === 'is_not') {
    return { operator, values: search.dateFrom ? [search.dateFrom] : [] };
  }
  if (operator === 'not_between') {
    return {
      operator,
      values: [search.dateFrom ?? '', search.dateTo ?? ''],
    };
  }
  return {
    operator: 'between',
    values: [search.dateFrom ?? '', search.dateTo ?? ''],
  };
};

/** Maps editor state back to URL params. Undefined keys clear stale params on merge. */
export const dateFilterToSearch = (
  operator: string,
  values: string[]
): Partial<TransactionSearch> => {
  const [first = '', second = ''] = values;
  const from = first || undefined;
  const to = second || undefined;
  switch (operator) {
    case 'after':
      return { dateFrom: from, dateTo: undefined, dateRange_op: 'after' };
    case 'before':
      return {
        dateFrom: undefined,
        dateTo: first || undefined,
        dateRange_op: 'before',
      };
    case 'is':
    case 'is_not':
      return { dateFrom: from, dateTo: undefined, dateRange_op: operator };
    case 'not_between':
      return {
        dateFrom: from,
        dateTo: to,
        dateRange_op: 'not_between',
      };
    default:
      return { dateFrom: from, dateTo: to, dateRange_op: undefined };
  }
};

export type TransactionDatePresetId = 'this_month' | 'last_month' | 'this_year';

export const TRANSACTION_DATE_PRESETS: {
  id: TransactionDatePresetId;
  label: string;
}[] = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_year', label: 'This year' },
];

export const presetDateRange = (
  id: TransactionDatePresetId,
  today: Date = new Date()
): { from: Date; to: Date } => {
  switch (id) {
    case 'last_month': {
      const month = subMonths(today, 1);
      return { from: startOfMonth(month), to: endOfMonth(month) };
    }
    case 'this_year':
      return { from: startOfYear(today), to: endOfYear(today) };
    default:
      return { from: startOfMonth(today), to: endOfMonth(today) };
  }
};

export type TransactionDateFilterKind =
  TransactionDatePresetId | 'all' | 'custom';

/** Classifies the current filter: a preset, the implicit all-time default, or a custom range. */
export const dateFilterKind = (
  operator: string,
  values: string[],
  today: Date = new Date()
): TransactionDateFilterKind => {
  if (operator !== 'between') return 'custom';
  const [from = '', to = ''] = values;
  if (!from && !to) return 'all';
  for (const preset of TRANSACTION_DATE_PRESETS) {
    const range = presetDateRange(preset.id, today);
    if (from === toFilterValue(range.from) && to === toFilterValue(range.to)) {
      return preset.id;
    }
  }
  return 'custom';
};

const formatShortDate = (value: string, includeYear: boolean): string => {
  const date = parseFilterDate(value);
  if (!date) return '';
  return format(date, includeYear ? 'MMM d, yyyy' : 'MMM d');
};

const formatDateRangeLabel = (values: string[]): string => {
  const [from = '', to = ''] = values;
  const fromDate = parseFilterDate(from);
  const toDate = parseFilterDate(to);
  if (!fromDate && !toDate) return '';
  if (fromDate && toDate && fromDate.getFullYear() === toDate.getFullYear()) {
    return `${format(fromDate, 'MMM d')} – ${format(toDate, 'MMM d, yyyy')}`;
  }
  const parts = [from, to]
    .filter(Boolean)
    .map((value) => formatShortDate(value, true))
    .filter(Boolean);
  return parts.join(' – ');
};

/** Button/chip label: preset name, "All time", or a formatted custom range. */
export const formatTransactionDateFilterLabel = (
  operator: string,
  values: string[],
  today: Date = new Date()
): string => {
  const kind = dateFilterKind(operator, values, today);
  if (kind === 'all') return 'All time';
  if (kind !== 'custom') {
    return (
      TRANSACTION_DATE_PRESETS.find((preset) => preset.id === kind)?.label ??
      'Custom'
    );
  }
  const operatorLabel =
    TRANSACTION_DATE_OPERATORS.find((op) => op.value === operator)?.label ??
    operator;
  if (isRangeDateOperator(operator)) {
    const rangeLabel = formatDateRangeLabel(values);
    return operator === 'between'
      ? rangeLabel || 'All time'
      : `${operatorLabel} ${rangeLabel}`.trim();
  }
  const dateLabel = formatShortDate(values[0] ?? '', true);
  return `${operatorLabel} ${dateLabel}`.trim();
};

/** Codec state → DateSelector value. */
export const filterToSelectorValue = (
  filter: TransactionDateFilterValue
): DateSelectorValue => {
  const operator = filter.operator as DateSelectorFilterType;
  const from = parseFilterDate(filter.values[0] ?? '');
  const to = isRangeDateOperator(filter.operator)
    ? parseFilterDate(filter.values[1] ?? '')
    : undefined;
  return { operator, startDate: from, endDate: to };
};

/**
 * DateSelector value → codec state. Returns `null` for incomplete selections
 * (e.g. one end of a range picked) so hosts can ignore them.
 */
export const selectorValueToFilter = (
  value: DateSelectorValue | undefined
): TransactionDateFilterValue | null => {
  const operator = value?.operator ?? 'between';
  const from = value?.startDate;
  const to = value?.endDate;
  if (isRangeDateOperator(operator)) {
    if (!from && !to) return { operator: 'between', values: [] };
    if (!from || !to) return null;
    return { operator, values: [toFilterValue(from), toFilterValue(to)] };
  }
  if (!from) return { operator: 'between', values: [] };
  return { operator, values: [toFilterValue(from)] };
};
