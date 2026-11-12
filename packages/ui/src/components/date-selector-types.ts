export interface DateSelectorI18nConfig {
  clear: string;
  today: string;
  filterTypes: {
    is: string;
    isNot: string;
    before: string;
    after: string;
    between: string;
    notBetween: string;
  };
  months: string[];
  weekdays: string[];
  weekdaysShort: string[];
  placeholder: string;
}

export const DATE_FILTER_TYPES = [
  'is',
  'is_not',
  'before',
  'after',
  'between',
  'not_between',
] as const;

export type DateSelectorFilterType = (typeof DATE_FILTER_TYPES)[number];

export const isRangeFilterType = (type: DateSelectorFilterType): boolean =>
  type === 'between' || type === 'not_between';

export interface DateSelectorValue {
  operator: DateSelectorFilterType;
  startDate?: Date;
  endDate?: Date;
}
