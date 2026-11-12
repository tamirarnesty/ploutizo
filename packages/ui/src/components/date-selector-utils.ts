import { format } from 'date-fns';
import {
  type DateSelectorFilterType,
  type DateSelectorI18nConfig,
  type DateSelectorValue,
} from './date-selector-types';

export const DEFAULT_DATE_SELECTOR_I18N: DateSelectorI18nConfig = {
  clear: 'Clear',
  today: 'Today',
  filterTypes: {
    is: 'Is',
    isNot: 'Is not',
    before: 'Before',
    after: 'After',
    between: 'Between',
    notBetween: 'Not between',
  },
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  weekdays: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
  weekdaysShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  placeholder: 'Select date...',
};

export const formatDateValue = (
  value: DateSelectorValue,
  dayDateFormat: string = 'MM/dd/yyyy'
): string => {
  const { startDate, endDate } = value;
  if (startDate && endDate) {
    return `${format(startDate, dayDateFormat)} - ${format(endDate, dayDateFormat)}`;
  }
  if (startDate) {
    return format(startDate, dayDateFormat);
  }
  return '';
};

const FILTER_TYPE_LABEL_KEYS = {
  is: 'is',
  is_not: 'isNot',
  before: 'before',
  after: 'after',
  between: 'between',
  not_between: 'notBetween',
} as const satisfies Record<
  DateSelectorFilterType,
  keyof DateSelectorI18nConfig['filterTypes']
>;

/** Display label for an operator — the single source for toggles and summaries. */
export const getFilterTypeLabel = (
  i18n: Pick<DateSelectorI18nConfig, 'filterTypes'>,
  type: DateSelectorFilterType
): string => i18n.filterTypes[FILTER_TYPE_LABEL_KEYS[type]];
