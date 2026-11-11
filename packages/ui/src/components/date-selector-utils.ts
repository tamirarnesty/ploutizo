import { format } from 'date-fns';
import {
  type DateSelectorI18nConfig,
  type DateSelectorValue,
} from './date-selector-types';

export const DEFAULT_DATE_SELECTOR_I18N: DateSelectorI18nConfig = {
  clear: 'Clear',
  today: 'Today',
  filterTypes: {
    is: 'is',
    isNot: 'is not',
    before: 'before',
    after: 'after',
    between: 'between',
    notBetween: 'not between',
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
