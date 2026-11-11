'use client';

import {
  type ChangeEvent,
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { addMonths, isSameMonth, parse, subMonths } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CornerUpLeftIcon,
  CornerUpRightIcon,
  XIcon,
} from 'lucide-react';

import { useDateSelector } from './use-date-selector';
import {
  DEFAULT_DATE_SELECTOR_I18N,
  formatDateValue,
} from './date-selector-utils';
import {
  type DateSelectorFilterType,
  type DateSelectorI18nConfig,
  type DateSelectorValue,
  isRangeFilterType,
} from './date-selector-types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { Calendar, CalendarDayButton } from '@/components/calendar';
import { Input } from '@/components/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/tabs';

export type {
  DateSelectorFilterType,
  DateSelectorI18nConfig,
  DateSelectorValue,
} from './date-selector-types';
export { useDateSelector } from './use-date-selector';

interface DateSelectorContextValue {
  i18n: DateSelectorI18nConfig;
}

const DateSelectorContext = createContext<DateSelectorContextValue>({
  i18n: DEFAULT_DATE_SELECTOR_I18N,
});

const useDateSelectorContext = () => useContext(DateSelectorContext);

// The clock has no event to subscribe to, but a store snapshot is still read
// on every render. Compiled, a render-body clock read is cached at mount.
const subscribeToClock = () => () => {};

/** Where a calendar month sits against today's month. */
function getMonthPosition(month: Date | undefined) {
  const today = new Date();
  if (!month || isSameMonth(month, today)) return 'current';
  return month > today ? 'future' : 'past';
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
  const getSnapshot = useCallback(
    () => getMonthPosition(calendarMonth),
    [calendarMonth]
  );
  const monthPosition = useSyncExternalStore(
    subscribeToClock,
    getSnapshot,
    getSnapshot
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

interface DateSelectorDayHoverContextValue {
  enabled: boolean;
  onDayHover?: (day: Date | undefined) => void;
}

const DateSelectorDayHoverContext =
  createContext<DateSelectorDayHoverContextValue>({ enabled: false });

function DateSelectorCalendarDayButton(
  props: ComponentProps<typeof CalendarDayButton>
) {
  const { enabled, onDayHover } = useContext(DateSelectorDayHoverContext);

  return (
    <CalendarDayButton
      {...props}
      onMouseEnter={() => {
        if (enabled) onDayHover?.(props.day.date);
      }}
      onMouseLeave={() => {
        if (enabled) onDayHover?.(undefined);
      }}
    />
  );
}

const DATE_SELECTOR_CALENDAR_COMPONENTS = {
  DayButton: DateSelectorCalendarDayButton,
};

const DATE_SELECTOR_CALENDAR_CLASS_NAMES = {
  months: 'flex flex-wrap items-start justify-between gap-5 w-full',
  month: 'flex flex-col items-center min-w-0 flex-1',
  nav: 'hidden',
};

function useDateSelectorFormatters() {
  const { i18n } = useDateSelectorContext();

  return useMemo(
    () => ({
      formatWeekdayName: (date: Date) => {
        const dayIndex = date.getDay();
        return i18n.weekdaysShort[dayIndex] || i18n.weekdays[dayIndex];
      },
      formatMonthCaption: (date: Date) => {
        const monthIndex = date.getMonth();
        const year = date.getFullYear();
        return `${i18n.months[monthIndex]} ${year}`;
      },
    }),
    [i18n]
  );
}

interface DateSelectorCalendarBaseProps {
  currentMonth: Date;
  selectedDate?: Date;
  onDayClick: (day: Date) => void;
  numberOfMonths: number;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

const getRangeSelection = ({
  selectedDate,
  selectedEndDate,
  hoverDate,
}: {
  selectedDate?: Date;
  selectedEndDate?: Date;
  hoverDate?: Date;
}): DateRange | undefined => {
  if (selectedDate && selectedEndDate) {
    return { from: selectedDate, to: selectedEndDate };
  }
  if (selectedDate) {
    return { from: selectedDate, to: hoverDate || selectedDate };
  }
  return undefined;
};

const getRangeSelectDay = (range: DateRange | undefined) => {
  if (!range?.from) return undefined;
  return range.to ?? range.from;
};

function DateSelectorRangeCalendar({
  currentMonth,
  selectedDate,
  selectedEndDate,
  hoverDate,
  onDayClick,
  onDayHover,
  numberOfMonths,
  weekStartsOn,
}: DateSelectorCalendarBaseProps & {
  selectedEndDate?: Date;
  hoverDate?: Date;
  onDayHover?: (day: Date | undefined) => void;
}) {
  const formatters = useDateSelectorFormatters();
  const selected = getRangeSelection({
    selectedDate,
    selectedEndDate,
    hoverDate,
  });
  const hoverContextValue = useMemo(
    () => ({ enabled: true, onDayHover }),
    [onDayHover]
  );

  const handleSelect = (range: DateRange | undefined) => {
    const day = getRangeSelectDay(range);
    if (day) onDayClick(day);
  };

  return (
    <DateSelectorDayHoverContext.Provider value={hoverContextValue}>
      <Calendar
        month={currentMonth}
        mode="range"
        selected={selected}
        onSelect={handleSelect}
        numberOfMonths={numberOfMonths}
        showOutsideDays={true}
        weekStartsOn={weekStartsOn}
        formatters={formatters}
        className="w-full shrink-0 p-0"
        classNames={DATE_SELECTOR_CALENDAR_CLASS_NAMES}
        components={DATE_SELECTOR_CALENDAR_COMPONENTS}
      />
    </DateSelectorDayHoverContext.Provider>
  );
}

function DateSelectorSingleCalendar({
  currentMonth,
  selectedDate,
  onDayClick,
  numberOfMonths,
  weekStartsOn,
}: DateSelectorCalendarBaseProps) {
  const formatters = useDateSelectorFormatters();

  const handleSelect = (date: Date | undefined) => {
    if (date) onDayClick(date);
  };

  return (
    <Calendar
      month={currentMonth}
      mode="single"
      selected={selectedDate}
      onSelect={handleSelect}
      numberOfMonths={numberOfMonths}
      showOutsideDays={true}
      weekStartsOn={weekStartsOn}
      formatters={formatters}
      className="w-full shrink-0 p-0"
      classNames={DATE_SELECTOR_CALENDAR_CLASS_NAMES}
      components={DATE_SELECTOR_CALENDAR_COMPONENTS}
    />
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
  const isMobile = useIsMobile();
  const numberOfMonths = isMobile ? 1 : showTwoMonths ? 2 : 1;
  const sharedProps = {
    currentMonth,
    selectedDate,
    onDayClick,
    numberOfMonths,
    weekStartsOn,
  };

  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      {isRange ? (
        <DateSelectorRangeCalendar
          {...sharedProps}
          selectedEndDate={selectedEndDate}
          hoverDate={hoverDate}
          onDayHover={onDayHover}
        />
      ) : (
        <DateSelectorSingleCalendar {...sharedProps} />
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
  /** Controlled calendar month (e.g. jump to a preset's month). */
  month?: Date;
  onMonthChange?: (month: Date) => void;
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
  month,
  onMonthChange,
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
    setValue,
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
    month,
    onMonthChange,
  });

  const displayValue = formatDateValue(currentValue, dayDateFormat);
  const [inputDraft, setInputDraft] = useState<string | null>(null);
  const inputValue = inputDraft ?? displayValue;
  const isInputFocused = inputDraft !== null;

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
      const nextValue = e.target.value;
      setInputDraft(nextValue);

      const parsed = parseInputValue(nextValue);
      if (parsed) {
        setValue(parsed);
      }
    },
    [parseInputValue, setValue]
  );

  const contextValue = useMemo(() => ({ i18n: mergedI18n }), [mergedI18n]);

  return (
    <DateSelectorContext.Provider value={contextValue}>
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
                onFocus={() => setInputDraft(inputValue)}
                onBlur={() => setInputDraft(null)}
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
