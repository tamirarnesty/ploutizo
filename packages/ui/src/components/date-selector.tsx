'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  addMonths,
  format,
  isBefore,
  isSameMonth,
  parse,
  subMonths,
} from 'date-fns';
import { type DateRange, type DayButton } from 'react-day-picker';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CornerUpLeftIcon,
  CornerUpRightIcon,
  XIcon,
} from 'lucide-react';
import { type ChangeEvent, type ComponentProps } from 'react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { Calendar, CalendarDayButton } from '@/components/calendar';
import { Input } from '@/components/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/tabs';

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

export type DateSelectorFilterType =
  'is' | 'is_not' | 'before' | 'after' | 'between' | 'not_between';

/** `between` and `not_between` both pick a two-end range. */
const isRangeFilterType = (type: DateSelectorFilterType): boolean =>
  type === 'between' || type === 'not_between';

export interface DateSelectorValue {
  operator: DateSelectorFilterType;
  startDate?: Date;
  endDate?: Date;
}

interface DateSelectorContextValue {
  i18n: DateSelectorI18nConfig;
}

const DateSelectorContext = createContext<DateSelectorContextValue>({
  i18n: DEFAULT_DATE_SELECTOR_I18N,
});

const useDateSelectorContext = () => useContext(DateSelectorContext);

export function formatDateValue(
  value: DateSelectorValue,
  i18n: DateSelectorI18nConfig = DEFAULT_DATE_SELECTOR_I18N,
  dayDateFormat: string = 'MM/dd/yyyy'
): string {
  void i18n;
  const { startDate, endDate } = value;
  if (startDate && endDate) {
    return `${format(startDate, dayDateFormat)} - ${format(endDate, dayDateFormat)}`;
  }
  if (startDate) {
    return format(startDate, dayDateFormat);
  }
  return '';
}

interface UseDateSelectorOptions {
  value?: DateSelectorValue;
  onChange?: (value: DateSelectorValue) => void;
  defaultFilterType?: DateSelectorFilterType;
  allowRange?: boolean;
}

// The clock has no event to subscribe to, but a store snapshot is still read
// on every render. Compiled, a render-body clock read is cached at mount.
const subscribeToClock = () => () => {};
const getCurrentYear = () => new Date().getFullYear();

/** Where a calendar month sits against today's month. */
function getMonthPosition(month: Date | undefined) {
  const today = new Date();
  if (!month || isSameMonth(month, today)) return 'current';
  return month > today ? 'future' : 'past';
}

export function useDateSelector({
  value,
  onChange,
  defaultFilterType = 'is',
  allowRange = true,
}: UseDateSelectorOptions) {
  const [filterType, setFilterType] = useState<DateSelectorFilterType>(
    value?.operator ?? defaultFilterType
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value?.startDate
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(
    value?.endDate
  );
  const [calendarMonth, setCalendarMonth] = useState(
    () => value?.startDate || new Date()
  );
  const [hoverDate, setHoverDate] = useState<Date | undefined>();

  const currentValue = useMemo<DateSelectorValue>(
    () => ({
      operator: filterType,
      startDate: selectedDate,
      endDate: selectedEndDate,
    }),
    [filterType, selectedDate, selectedEndDate]
  );

  const clearSelection = useCallback(() => {
    setSelectedDate(undefined);
    setSelectedEndDate(undefined);
    setHoverDate(undefined);
  }, []);

  const handleDayClick = useCallback(
    (day: Date) => {
      if (isRangeFilterType(filterType) && allowRange) {
        if (!selectedDate || selectedEndDate) {
          setSelectedDate(day);
          setSelectedEndDate(undefined);
        } else {
          if (isBefore(day, selectedDate)) {
            setSelectedEndDate(selectedDate);
            setSelectedDate(day);
          } else {
            setSelectedEndDate(day);
          }
        }
      } else {
        setSelectedDate(day);
        setSelectedEndDate(undefined);
      }
    },
    [filterType, allowRange, selectedDate, selectedEndDate]
  );

  const handleFilterTypeChange = useCallback(
    (type: DateSelectorFilterType) => {
      setFilterType(type);
      clearSelection();
    },
    [clearSelection]
  );

  useEffect(() => {
    if (value) {
      setFilterType(value.operator);
      setSelectedDate(value.startDate);
      setSelectedEndDate(value.endDate);
    }
  }, [value, defaultFilterType]);

  useEffect(() => {
    onChange?.(currentValue);
  }, [currentValue, onChange]);

  return {
    filterType,
    selectedDate,
    selectedEndDate,
    calendarMonth,
    hoverDate,
    currentValue,
    setFilterType: handleFilterTypeChange,
    setCalendarMonth,
    setHoverDate,
    clearSelection,
    handleDayClick,
  };
}

interface DateSelectorFilterToggleProps {
  value: DateSelectorFilterType;
  onChange: (value: DateSelectorFilterType) => void;
  showBetween?: boolean;
  className?: string;
}

function DateSelectorFilterToggle({
  value,
  onChange,
  showBetween = true,
  className,
}: DateSelectorFilterToggleProps) {
  const { i18n } = useDateSelectorContext();

  const operators: {
    value: DateSelectorFilterType;
    label: string;
    show: boolean;
  }[] = [
    { value: 'is', label: i18n.filterTypes.is, show: true },
    { value: 'is_not', label: i18n.filterTypes.isNot, show: true },
    { value: 'before', label: i18n.filterTypes.before, show: true },
    { value: 'after', label: i18n.filterTypes.after, show: true },
    { value: 'between', label: i18n.filterTypes.between, show: showBetween },
    {
      value: 'not_between',
      label: i18n.filterTypes.notBetween,
      show: showBetween,
    },
  ];

  return (
    <Tabs
      value={value}
      onValueChange={(newValue) => {
        if (newValue) {
          onChange(newValue as DateSelectorFilterType);
        }
      }}
      className={className}
    >
      <TabsList className="bg-muted/80">
        {operators
          .filter((operator) => operator.show)
          .map((operator) => (
            <TabsTrigger
              key={operator.value}
              value={operator.value}
              aria-label={operator.label}
              className="py-1 font-normal"
            >
              {operator.label}
            </TabsTrigger>
          ))}
      </TabsList>
    </Tabs>
  );
}

// Month navigation sits beside the input field. The Today button keeps its
// slot (invisible) so the row never shifts layout.
function DateSelectorMonthNav({
  calendarMonth,
  onMonthChange,
}: {
  calendarMonth: Date;
  onMonthChange: (date: Date) => void;
}) {
  const { i18n } = useDateSelectorContext();
  const getCalendarMonthPosition = () => getMonthPosition(calendarMonth);
  const monthPosition = useSyncExternalStore(
    subscribeToClock,
    getCalendarMonthPosition,
    getCalendarMonthPosition
  );

  return (
    <div className="flex shrink-0 items-center">
      <Button
        variant="ghost"
        className={cn('size-8.5', monthPosition === 'current' && 'invisible')}
        onClick={() => onMonthChange(new Date())}
        title={i18n.today}
        aria-label={i18n.today}
        tabIndex={monthPosition === 'current' ? -1 : undefined}
      >
        {monthPosition === 'future' ? (
          <CornerUpLeftIcon />
        ) : (
          <CornerUpRightIcon />
        )}
      </Button>
      <Button
        variant="ghost"
        className="size-8.5"
        onClick={() => onMonthChange(subMonths(calendarMonth, 1))}
        aria-label="Previous month"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        className="size-8.5"
        onClick={() => onMonthChange(addMonths(calendarMonth, 1))}
        aria-label="Next month"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}

interface DateSelectorDayPickerProps {
  currentMonth: Date;
  selectedDate?: Date;
  selectedEndDate?: Date;
  onDayClick: (day: Date) => void;
  isRange: boolean;
  onDayHover?: (day: Date | undefined) => void;
  hoverDate?: Date;
  showTwoMonths?: boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

function DateSelectorDayPicker({
  currentMonth,
  selectedDate,
  selectedEndDate,
  onDayClick,
  isRange,
  onDayHover,
  hoverDate,
  showTwoMonths = true,
  weekStartsOn,
  className,
}: DateSelectorDayPickerProps) {
  const { i18n } = useDateSelectorContext();
  const isMobile = useIsMobile();

  // Convert to react-day-picker format
  const selected: Date | DateRange | undefined = isRange
    ? selectedDate && selectedEndDate
      ? { from: selectedDate, to: selectedEndDate }
      : selectedDate
        ? { from: selectedDate, to: hoverDate || selectedDate }
        : undefined
    : selectedDate;

  const handleSelect = (date: Date | DateRange | undefined) => {
    if (!date) {
      return;
    }

    if (isRange && 'from' in date) {
      // For range mode
      if (date.from && !date.to) {
        // First click - set start date
        onDayClick(date.from);
      } else if (date.from && date.to) {
        // Range selected - set end date
        onDayClick(date.to);
      }
    } else if (!isRange && date instanceof Date) {
      onDayClick(date);
    }
  };

  // Create custom DayButton component with hover support
  const CustomDayButton = useCallback(
    (props: ComponentProps<typeof DayButton>) => {
      return (
        <CalendarDayButton
          {...props}
          onMouseEnter={() => {
            if (isRange && onDayHover) {
              onDayHover(props.day.date);
            }
          }}
          onMouseLeave={() => {
            if (isRange && onDayHover) {
              onDayHover(undefined);
            }
          }}
        />
      );
    },
    [isRange, onDayHover]
  );

  // Create custom formatters for i18n
  const formatters = {
    formatWeekdayName: (date: Date) => {
      const dayIndex = date.getDay();
      return i18n.weekdaysShort[dayIndex] || i18n.weekdays[dayIndex];
    },
    formatMonthCaption: (date: Date) => {
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      return `${i18n.months[monthIndex]} ${year}`;
    },
  };

  const calendarClassNames = {
    months: 'flex flex-wrap items-start justify-between gap-5 w-full',
    month: 'flex flex-col items-center min-w-0 flex-1',
    nav: 'hidden',
  };
  const calendarComponents = { DayButton: CustomDayButton };

  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      {isRange ? (
        <Calendar
          month={currentMonth}
          mode="range"
          selected={selected as DateRange | undefined}
          onSelect={handleSelect as (range: DateRange | undefined) => void}
          numberOfMonths={isMobile ? 1 : showTwoMonths ? 2 : 1}
          showOutsideDays={true}
          weekStartsOn={weekStartsOn}
          formatters={formatters}
          className="w-full shrink-0 p-0"
          classNames={calendarClassNames}
          components={calendarComponents}
        />
      ) : (
        <Calendar
          month={currentMonth}
          mode="single"
          selected={selected as Date | undefined}
          onSelect={handleSelect as (date: Date | undefined) => void}
          numberOfMonths={isMobile ? 1 : showTwoMonths ? 2 : 1}
          showOutsideDays={true}
          weekStartsOn={weekStartsOn}
          formatters={formatters}
          className="w-full shrink-0 p-0"
          classNames={calendarClassNames}
          components={calendarComponents}
        />
      )}
    </div>
  );
}

export interface DateSelectorProps {
  value?: DateSelectorValue;
  onChange?: (value: DateSelectorValue) => void;
  allowRange?: boolean;
  defaultFilterType?: DateSelectorFilterType;
  showInput?: boolean;
  showTwoMonths?: boolean;
  label?: string;
  className?: string;
  i18n?: Partial<DateSelectorI18nConfig>;
  inputHint?: string;
  dayDateFormat?: string;
  dayDateFormats?: string[];
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function DateSelector({
  value,
  onChange,
  allowRange = true,
  defaultFilterType = 'is',
  showInput = true,
  showTwoMonths = true,
  label,
  className,
  i18n: i18nOverride,
  inputHint,
  dayDateFormat = 'MM/dd/yyyy',
  dayDateFormats,
  weekStartsOn,
}: DateSelectorProps) {
  const mergedI18n = useMemo(
    () => ({ ...DEFAULT_DATE_SELECTOR_I18N, ...i18nOverride }),
    [i18nOverride]
  );

  const {
    filterType,
    selectedDate,
    selectedEndDate,
    calendarMonth,
    hoverDate,
    currentValue,
    setFilterType,
    setCalendarMonth,
    setHoverDate,
    clearSelection,
    handleDayClick,
  } = useDateSelector({
    value,
    onChange,
    defaultFilterType,
    allowRange,
  });

  const displayValue = formatDateValue(currentValue, mergedI18n, dayDateFormat);
  const [inputValue, setInputValue] = useState(displayValue);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Sync input value when displayValue changes (but not when user is typing)
  useEffect(() => {
    if (!isInputFocused) {
      setInputValue(displayValue);
    }
  }, [displayValue, isInputFocused]);

  // Compute date formats for parsing
  const dateFormats = useMemo(() => {
    if (dayDateFormats && dayDateFormats.length > 0) {
      // Use provided formats, with dayDateFormat first if not already included
      const formats = [...dayDateFormats];
      if (!formats.includes(dayDateFormat)) {
        formats.unshift(dayDateFormat);
      }
      return formats;
    }
    // Default formats: use dayDateFormat first, then common alternatives
    const defaultFormats = [
      dayDateFormat,
      'dd/MM/yyyy',
      'yyyy-MM-dd',
      'MM-dd-yyyy',
      'dd-MM-yyyy',
    ];
    // Remove duplicates while preserving order
    return Array.from(new Set(defaultFormats));
  }, [dayDateFormat, dayDateFormats]);

  // Parse input text to DateSelectorValue
  const parseInputValue = useCallback(
    (text: string): DateSelectorValue | null => {
      if (!text.trim()) return null;

      const trimmed = text.trim();

      // Try parsing as date using computed formats
      for (const dateFormat of dateFormats) {
        try {
          const parsed = parse(trimmed, dateFormat, new Date());
          if (!isNaN(parsed.getTime())) {
            return {
              operator: filterType,
              startDate: parsed,
            };
          }
        } catch {
          // Continue to next format
        }
      }

      return null;
    },
    [filterType, dateFormats]
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Try to parse the input
      const parsed = parseInputValue(newValue);
      if (parsed) {
        onChange?.(parsed);
      }
    },
    [onChange, parseInputValue]
  );

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    // Reset to display value if parsing failed
    if (!parseInputValue(inputValue)) {
      setInputValue(displayValue);
    }
  }, [inputValue, displayValue, parseInputValue]);

  return (
    <DateSelectorContext.Provider value={{ i18n: mergedI18n }}>
      <div className={cn('w-full space-y-4 sm:w-[470px]', className)}>
        <div className="flex flex-wrap items-center gap-3">
          {label ? (
            <h3 className="text-sm font-medium" data-slot="data-selector-label">
              {label}
            </h3>
          ) : null}
          <DateSelectorFilterToggle
            value={filterType}
            onChange={setFilterType}
            showBetween={allowRange}
          />
        </div>
        <div className="flex items-center gap-2">
          {showInput ? (
            <div className="relative min-w-0 flex-1">
              <Input
                type="text"
                value={inputHint ? inputValue : displayValue}
                readOnly={!inputHint}
                placeholder={
                  isInputFocused && inputHint
                    ? inputHint
                    : mergedI18n.placeholder
                }
                onFocus={() => setIsInputFocused(true)}
                onBlur={handleInputBlur}
                onChange={handleInputChange}
              />
              {(inputHint ? inputValue : displayValue) && (
                <button
                  type="button"
                  aria-label={mergedI18n.clear}
                  onClick={clearSelection}
                  className={cn(
                    // Base Styles
                    'absolute end-2.5 top-1/2 size-4 -translate-y-1/2 cursor-pointer rounded-xs',
                    // Visual States
                    'opacity-70 transition-opacity hover:opacity-100',
                    // Focus States
                    'ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none'
                  )}
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              )}
            </div>
          ) : null}
          <DateSelectorMonthNav
            calendarMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
          />
        </div>
        <DateSelectorDayPicker
          currentMonth={calendarMonth}
          selectedDate={selectedDate}
          selectedEndDate={selectedEndDate}
          onDayClick={handleDayClick}
          isRange={isRangeFilterType(filterType) && allowRange}
          onDayHover={setHoverDate}
          hoverDate={hoverDate}
          showTwoMonths={showTwoMonths}
          weekStartsOn={weekStartsOn}
        />
      </div>
    </DateSelectorContext.Provider>
  );
}
