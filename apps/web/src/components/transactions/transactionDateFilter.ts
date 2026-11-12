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
import {
  DEFAULT_DATE_SELECTOR_I18N,
  getFilterTypeLabel,
} from '@ploutizo/ui/components/date-selector';
import type { DateSelectorValue } from '@ploutizo/ui/components/date-selector';
import type { TransactionSearch } from './transactionSearch';

const SINGLE_DATE_OPERATORS = ['is', 'is_not', 'before', 'after'] as const;
const RANGE_DATE_OPERATORS = ['between', 'not_between'] as const;

export type SingleDateOperator = (typeof SINGLE_DATE_OPERATORS)[number];
export type RangeDateOperator = (typeof RANGE_DATE_OPERATORS)[number];

/**
 * An applied date filter; "all time" is the absence of one (`null`). Dates are
 * `yyyy-MM-dd`. Ranges always carry both ends — a lone bound is expressed with
 * `before` / `after`.
 */
export type TransactionDateFilter =
  | { operator: SingleDateOperator; date: string }
  | { operator: RangeDateOperator; from: string; to: string };

const isSingleOperator = (value: string): value is SingleDateOperator =>
  SINGLE_DATE_OPERATORS.some((operator) => operator === value);

const isRangeOperator = (value: string): value is RangeDateOperator =>
  RANGE_DATE_OPERATORS.some((operator) => operator === value);

/** URL param carrying each single-date operator's date. */
const SINGLE_DATE_PARAM = {
  is: 'dateFrom',
  is_not: 'dateFrom',
  after: 'dateFrom',
  before: 'dateTo',
} as const satisfies Record<SingleDateOperator, 'dateFrom' | 'dateTo'>;

const CLEARED_DATE_PARAMS = {
  dateFrom: undefined,
  dateTo: undefined,
  dateRange_op: undefined,
} satisfies Partial<TransactionSearch>;

/** Reads the date filter from URL params; unusable combinations read as none. */
export const dateFilterFromSearch = (
  search: Pick<TransactionSearch, 'dateFrom' | 'dateTo' | 'dateRange_op'>
): TransactionDateFilter | null => {
  const operator = search.dateRange_op ?? 'between';
  if (isSingleOperator(operator)) {
    const date = search[SINGLE_DATE_PARAM[operator]];
    return date ? { operator, date } : null;
  }
  const { dateFrom: from, dateTo: to } = search;
  if (!from || !to) return null;
  return {
    operator: isRangeOperator(operator) ? operator : 'between',
    from,
    to,
  };
};

/** Inverse of `dateFilterFromSearch`; undefined keys clear stale params on merge. */
export const dateFilterToSearch = (
  filter: TransactionDateFilter | null
): Partial<TransactionSearch> => {
  if (!filter) return CLEARED_DATE_PARAMS;
  if ('date' in filter) {
    return {
      ...CLEARED_DATE_PARAMS,
      [SINGLE_DATE_PARAM[filter.operator]]: filter.date,
      dateRange_op: filter.operator,
    };
  }
  return {
    ...CLEARED_DATE_PARAMS,
    dateFrom: filter.from,
    dateTo: filter.to,
    // `between` is the default operator — keep it out of the URL.
    dateRange_op: filter.operator === 'between' ? undefined : filter.operator,
  };
};

const toFilterDate = (date: Date) => format(date, 'yyyy-MM-dd');

const parseFilterDate = (value: string): Date | undefined => {
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
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
  today: Date
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

/**
 * Month the calendar should show for a preset range: ranges containing today
 * keep today in view, past or future ranges anchor on their end.
 */
export const presetFocusMonth = (
  range: { from: Date; to: Date },
  today: Date
): Date => (today >= range.from && today <= range.to ? today : range.to);

/** Which preset (if any) the filter is exactly equal to. */
const matchingPreset = (
  filter: TransactionDateFilter | null,
  today: Date
): TransactionDatePresetId | undefined => {
  if (!filter || !('from' in filter) || filter.operator !== 'between') {
    return undefined;
  }
  return TRANSACTION_DATE_PRESETS.find(({ id }) => {
    const range = presetDateRange(id, today);
    return (
      filter.from === toFilterDate(range.from) &&
      filter.to === toFilterDate(range.to)
    );
  })?.id;
};

const formatDate = (value: string, pattern = 'MMM d, yyyy') => {
  const date = parseFilterDate(value);
  return date ? format(date, pattern) : value;
};

const formatRange = (from: string, to: string) => {
  const fromDate = parseFilterDate(from);
  const toDate = parseFilterDate(to);
  if (fromDate && toDate && fromDate.getFullYear() === toDate.getFullYear()) {
    return `${format(fromDate, 'MMM d')} – ${format(toDate, 'MMM d, yyyy')}`;
  }
  return `${formatDate(from)} – ${formatDate(to)}`;
};

/** Trigger/chip text: "All time", a preset name, or the operator and dates. */
export const formatTransactionDateFilterLabel = (
  filter: TransactionDateFilter | null,
  today: Date
): string => {
  if (!filter) return 'All time';
  const preset = matchingPreset(filter, today);
  if (preset) {
    return (
      TRANSACTION_DATE_PRESETS.find(({ id }) => id === preset)?.label ?? preset
    );
  }
  const operator = getFilterTypeLabel(
    DEFAULT_DATE_SELECTOR_I18N,
    filter.operator
  );
  if ('date' in filter) return `${operator} ${formatDate(filter.date)}`;
  const range = formatRange(filter.from, filter.to);
  return filter.operator === 'between' ? range : `${operator} ${range}`;
};

export const dateFilterToSelectorValue = (
  filter: TransactionDateFilter | null
): DateSelectorValue => {
  if (!filter) return { operator: 'between' };
  if ('date' in filter) {
    return {
      operator: filter.operator,
      startDate: parseFilterDate(filter.date),
    };
  }
  return {
    operator: filter.operator,
    startDate: parseFilterDate(filter.from),
    endDate: parseFilterDate(filter.to),
  };
};

/** A range with only one end picked cannot be applied yet. */
export const isDateSelectionComplete = (value: DateSelectorValue): boolean =>
  !isRangeOperator(value.operator) ||
  Boolean(value.startDate) === Boolean(value.endDate);

/** Selector value → filter; no date picked means no filter. Check completeness first. */
export const selectorValueToDateFilter = (
  value: DateSelectorValue
): TransactionDateFilter | null => {
  const { operator, startDate, endDate } = value;
  if (!startDate) return null;
  if (isRangeOperator(operator)) {
    return endDate
      ? {
          operator,
          from: toFilterDate(startDate),
          to: toFilterDate(endDate),
        }
      : null;
  }
  return isSingleOperator(operator)
    ? { operator, date: toFilterDate(startDate) }
    : null;
};
