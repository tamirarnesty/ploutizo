import {
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parse,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
} from 'date-fns';
import { isDateRangeOperator } from '@ploutizo/types';
import type { DateRangeOperator } from '@ploutizo/types';
import type { TransactionSearch } from './transactionSearch';

const RANGE_DATE_OPERATORS = ['between', 'not_between'] as const;

export type RangeDateOperator = (typeof RANGE_DATE_OPERATORS)[number];
export type SingleDateOperator = Exclude<DateRangeOperator, RangeDateOperator>;

export const isRangeDateOperator = (
  operator: DateRangeOperator
): operator is RangeDateOperator =>
  RANGE_DATE_OPERATORS.some((rangeOperator) => rangeOperator === operator);

// "All time" is `null`; dates are `yyyy-MM-dd`.
export type TransactionDateFilter =
  | { operator: SingleDateOperator; date: string }
  | { operator: RangeDateOperator; from: string; to: string };

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

export const dateFilterFromSearch = (
  search: Pick<TransactionSearch, 'dateFrom' | 'dateTo'> & {
    dateRange_op?: string;
  }
): TransactionDateFilter | null => {
  if (
    search.dateRange_op !== undefined &&
    !isDateRangeOperator(search.dateRange_op)
  ) {
    return null;
  }
  const operator: DateRangeOperator = search.dateRange_op ?? 'between';
  if (!isRangeDateOperator(operator)) {
    const date = search[SINGLE_DATE_PARAM[operator]];
    return date ? { operator, date } : null;
  }
  const { dateFrom: from, dateTo: to } = search;
  if (!from || !to) return null;
  return { operator, from, to };
};

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
    dateRange_op: filter.operator === 'between' ? undefined : filter.operator,
  };
};

export const toFilterDate = (date: Date) => format(date, 'yyyy-MM-dd');

export const parseFilterDate = (value: string): Date | undefined => {
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
};

const filterDay = (value: string): string | undefined =>
  parseFilterDate(value) ? value : undefined;

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
    case 'this_month':
      return { from: startOfMonth(today), to: endOfMonth(today) };
  }
};

export const presetFocusMonth = (
  range: { from: Date; to: Date },
  today: Date
): Date => (today >= range.from && today <= range.to ? today : range.to);

const matchingPreset = (filter: TransactionDateFilter | null, today: Date) => {
  if (!filter || !('from' in filter) || filter.operator !== 'between') {
    return undefined;
  }
  return TRANSACTION_DATE_PRESETS.find(({ id }) => {
    const range = presetDateRange(id, today);
    return (
      filter.from === toFilterDate(range.from) &&
      filter.to === toFilterDate(range.to)
    );
  });
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

const DATE_OPERATOR_LABELS = {
  is: 'Is',
  is_not: 'Is not',
  before: 'Before',
  after: 'After',
  between: 'Between',
  not_between: 'Not between',
} as const satisfies Record<DateRangeOperator, string>;

export const dateOperatorLabel = (operator: DateRangeOperator) =>
  DATE_OPERATOR_LABELS[operator];

export const formatTransactionDateFilterLabel = (
  filter: TransactionDateFilter | null,
  today: Date
): string => {
  if (!filter) return 'All time';
  const preset = matchingPreset(filter, today);
  if (preset) return preset.label;
  const operator = dateOperatorLabel(filter.operator);
  if ('date' in filter) return `${operator} ${formatDate(filter.date)}`;
  const range = formatRange(filter.from, filter.to);
  return filter.operator === 'between' ? range : `${operator} ${range}`;
};

const TYPED_DATE_FORMATS = [
  'MMM d, yyyy',
  'dd/MM/yyyy',
  'yyyy-MM-dd',
  'MM-dd-yyyy',
  'dd-MM-yyyy',
] as const;

export const parseTypedDate = (text: string): string | undefined => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  for (const pattern of TYPED_DATE_FORMATS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (!isValid(parsed)) continue;
    if (format(parsed, pattern).toLowerCase() !== trimmed.toLowerCase()) {
      continue;
    }
    return toFilterDate(parsed);
  }
  return undefined;
};

export type TransactionDateDraft = {
  operator: DateRangeOperator;
  start?: string;
  end?: string;
};

export const dateFilterToDraft = (
  filter: TransactionDateFilter | null
): TransactionDateDraft => {
  if (!filter) return { operator: 'between' };
  if ('date' in filter) {
    return { operator: filter.operator, start: filterDay(filter.date) };
  }
  return {
    operator: filter.operator,
    start: filterDay(filter.from),
    end: filterDay(filter.to),
  };
};

export const isDateDraftComplete = (draft: TransactionDateDraft): boolean =>
  !isRangeDateOperator(draft.operator) ||
  Boolean(draft.start) === Boolean(draft.end);

export const orderDateDraft = (
  draft: TransactionDateDraft
): TransactionDateDraft => {
  if (
    !isRangeDateOperator(draft.operator) ||
    !draft.start ||
    !draft.end ||
    draft.start <= draft.end
  ) {
    return draft;
  }
  return { ...draft, start: draft.end, end: draft.start };
};

/** Next draft after the day that was clicked. Ignores any hover preview. */
export const draftAfterDay = (
  draft: TransactionDateDraft,
  day: string
): TransactionDateDraft => {
  if (!isRangeDateOperator(draft.operator) || !draft.start || draft.end) {
    return { operator: draft.operator, start: day };
  }
  if (day < draft.start) {
    return { operator: draft.operator, start: day, end: draft.start };
  }
  return { operator: draft.operator, start: draft.start, end: day };
};

const DATE_DRAFT_SEPARATOR = ' – ';

/** One field for every operator. An open range keeps a trailing dash. */
export const formatDateDraft = (draft: TransactionDateDraft): string => {
  if (!draft.start) return '';
  const start = formatDate(draft.start);
  if (!isRangeDateOperator(draft.operator) || !draft.end) {
    return isRangeDateOperator(draft.operator) ? `${start} –` : start;
  }
  return `${start}${DATE_DRAFT_SEPARATOR}${formatDate(draft.end)}`;
};

const RANGE_TEXT_BREAK = /\s+(?:–|-|to)\s+/i;
const OPEN_RANGE_TEXT = /^(.*\S)\s+(?:–|-|to)\s*$/i;

/** `undefined` means the text is not a day the field can keep. */
export const parseDateDraftText = (
  operator: DateRangeOperator,
  text: string
): TransactionDateDraft | undefined => {
  const trimmed = text.trim();
  if (!trimmed) return { operator };
  if (!isRangeDateOperator(operator)) {
    const start = parseTypedDate(trimmed);
    return start ? { operator, start } : undefined;
  }

  const open = OPEN_RANGE_TEXT.exec(trimmed);
  if (open && !RANGE_TEXT_BREAK.test(open[1])) {
    const start = parseTypedDate(open[1]);
    return start ? { operator, start } : undefined;
  }

  const parts = trimmed.split(RANGE_TEXT_BREAK);
  if (parts.length === 1) {
    const start = parseTypedDate(parts[0]);
    return start ? { operator, start } : undefined;
  }
  if (parts.length !== 2) return undefined;
  const start = parseTypedDate(parts[0]);
  const end = parseTypedDate(parts[1]);
  if (!start || !end) return undefined;
  return orderDateDraft({ operator, start, end });
};

export const draftToDateFilter = (
  draft: TransactionDateDraft
): TransactionDateFilter | null => {
  const { operator, start, end } = draft;
  if (!start) return null;
  if (isRangeDateOperator(operator)) {
    return end ? { operator, from: start, to: end } : null;
  }
  return { operator, date: start };
};
