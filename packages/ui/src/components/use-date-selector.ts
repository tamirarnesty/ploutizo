import { isBefore } from 'date-fns';
import { useCallback, useState } from 'react';
import {
  type DateSelectorFilterType,
  type DateSelectorValue,
  isRangeFilterType,
} from './date-selector-types';

interface UseDateSelectorOptions {
  value?: DateSelectorValue;
  onChange?: (value: DateSelectorValue) => void;
  defaultFilterType?: DateSelectorFilterType;
  allowRange?: boolean;
  /** Controlled calendar month; omit to let the selector manage it. */
  month?: Date;
  onMonthChange?: (month: Date) => void;
}

/**
 * Date selector state. `value` is the committed selection when provided;
 * otherwise the hook owns an uncontrolled value. `onChange` fires from user
 * actions only — never from an effect — so parents can stage edits safely.
 */
export const useDateSelector = ({
  value,
  onChange,
  defaultFilterType = 'is',
  allowRange = true,
  month,
  onMonthChange,
}: UseDateSelectorOptions) => {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<DateSelectorValue>(
    () => value ?? { operator: defaultFilterType }
  );
  const currentValue = value ?? uncontrolledValue;
  const [internalMonth, setInternalMonth] = useState(
    () => currentValue.startDate || new Date()
  );
  const calendarMonth = month ?? internalMonth;
  const [hoverDate, setHoverDate] = useState<Date | undefined>();

  const setCalendarMonth = useCallback(
    (next: Date) => {
      if (onMonthChange) {
        onMonthChange(next);
      } else {
        setInternalMonth(next);
      }
    },
    [onMonthChange]
  );

  const setValue = useCallback(
    (next: DateSelectorValue) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  const setFilterType = useCallback(
    (type: DateSelectorFilterType) => {
      setValue({
        ...currentValue,
        operator: type,
        // Switching to a single-date operator drops the range end; the start
        // date stays so compatible operators keep the user's selection.
        endDate: isRangeFilterType(type) ? currentValue.endDate : undefined,
      });
    },
    [currentValue, setValue]
  );

  const clearSelection = useCallback(() => {
    setValue({ ...currentValue, startDate: undefined, endDate: undefined });
    setHoverDate(undefined);
  }, [currentValue, setValue]);

  const handleDayClick = useCallback(
    (day: Date) => {
      const { operator, startDate, endDate } = currentValue;
      let nextStartDate = startDate;
      let nextEndDate = endDate;

      if (isRangeFilterType(operator) && allowRange) {
        if (!startDate || endDate) {
          nextStartDate = day;
          nextEndDate = undefined;
        } else if (isBefore(day, startDate)) {
          nextStartDate = day;
          nextEndDate = startDate;
        } else {
          nextEndDate = day;
        }
      } else {
        nextStartDate = day;
        nextEndDate = undefined;
      }

      setValue({
        ...currentValue,
        startDate: nextStartDate,
        endDate: nextEndDate,
      });
    },
    [allowRange, currentValue, setValue]
  );

  return {
    filterType: currentValue.operator,
    selectedDate: currentValue.startDate,
    selectedEndDate: currentValue.endDate,
    calendarMonth,
    hoverDate,
    currentValue,
    setValue,
    setFilterType,
    setCalendarMonth,
    setHoverDate,
    clearSelection,
    handleDayClick,
  };
};
