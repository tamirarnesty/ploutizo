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

export type DateSelectorFilterType =
  'is' | 'is_not' | 'before' | 'after' | 'between' | 'not_between';

/** `between` and `not_between` both pick a two-end range. */
export const isRangeFilterType = (type: DateSelectorFilterType): boolean =>
  type === 'between' || type === 'not_between';

export interface DateSelectorValue {
  operator: DateSelectorFilterType;
  startDate?: Date;
  endDate?: Date;
}
