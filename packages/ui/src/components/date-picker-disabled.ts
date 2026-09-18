import { isValid, parseISO } from 'date-fns';

export type DatePickerDisabledDates = {
  /** Last selectable calendar date (`yyyy-MM-dd`). Later days are disabled. */
  after?: string;
};

/** Convert ISO calendar-date constraints into react-day-picker `disabled`. */
export const toCalendarDisabled = (
  disabledDates?: DatePickerDisabledDates
): { after: Date } | undefined => {
  if (!disabledDates?.after) return undefined;
  const after = parseISO(disabledDates.after);
  if (!isValid(after)) return undefined;
  return { after };
};
