import { useState } from 'react';
import { addMonths, isSameMonth, subMonths } from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CornerUpLeftIcon,
  CornerUpRightIcon,
  XIcon,
} from 'lucide-react';
import { DATE_RANGE_OPERATORS, isDateRangeOperator } from '@ploutizo/types';
import { Button } from '@ploutizo/ui/components/button';
import { Calendar } from '@ploutizo/ui/components/calendar';
import { Input } from '@ploutizo/ui/components/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import { Separator } from '@ploutizo/ui/components/separator';
import { Tabs, TabsList, TabsTrigger } from '@ploutizo/ui/components/tabs';
import { useIsMobile } from '@ploutizo/ui/hooks/use-mobile';
import { useToday } from '@ploutizo/ui/hooks/use-today';
import { cn } from '@ploutizo/ui/lib/utils';
import type { DateRangeOperator } from '@ploutizo/types';
import { TransactionFilterTrigger } from './TransactionFilterTrigger';
import {
  TRANSACTION_DATE_PRESETS,
  dateFilterFromSearch,
  dateFilterToDraft,
  dateOperatorLabel,
  draftAfterDay,
  draftToDateFilter,
  formatDateDraft,
  formatTransactionDateFilterLabel,
  isDateDraftComplete,
  isRangeDateOperator,
  parseDateDraftText,
  parseFilterDate,
  presetDateRange,
  presetFocusMonth,
  toFilterDate,
} from './transactionDateFilter';
import type {
  TransactionDateDraft,
  TransactionDateFilter,
  TransactionDatePresetId,
} from './transactionDateFilter';
import type { DateFilterConfig } from './transactionFilterConfig';
import type { TransactionSearch } from './transactionSearch';

const DATE_PRESETS = [
  ...TRANSACTION_DATE_PRESETS,
  { id: 'all', label: 'All time' },
] as const;

const CALENDAR_CLASS_NAMES = {
  months: 'flex flex-wrap items-start justify-between gap-5 w-full',
  month: 'flex flex-col items-center min-w-0 flex-1',
  nav: 'hidden',
};

const monthPosition = (month: Date, today: Date) => {
  if (isSameMonth(month, today)) return 'current';
  return month > today ? 'future' : 'past';
};

const dayInOpenRange = (
  date: Date,
  draft: TransactionDateDraft,
  hover: string | undefined
) => {
  if (
    !isRangeDateOperator(draft.operator) ||
    !draft.start ||
    draft.end ||
    !hover
  ) {
    return false;
  }
  const day = toFilterDate(date);
  if (day === draft.start) return false;
  const from = hover < draft.start ? hover : draft.start;
  const to = hover < draft.start ? draft.start : hover;
  return day >= from && day <= to;
};

const DateOperatorTabs = ({
  value,
  onChange,
}: {
  value: DateRangeOperator;
  onChange: (operator: DateRangeOperator) => void;
}) => (
  <Tabs
    value={value}
    onValueChange={(next) => {
      if (next && isDateRangeOperator(next)) onChange(next);
    }}
  >
    <TabsList className="bg-muted/80">
      {DATE_RANGE_OPERATORS.map((operator) => {
        const label = dateOperatorLabel(operator);
        return (
          <TabsTrigger
            key={operator}
            value={operator}
            aria-label={label}
            className="py-1 font-normal"
          >
            {label}
          </TabsTrigger>
        );
      })}
    </TabsList>
  </Tabs>
);

const DateMonthNav = ({
  month,
  onMonthChange,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
}) => {
  const today = useToday();
  const position = monthPosition(month, today);

  return (
    <div className="flex shrink-0 items-center">
      <Button
        type="button"
        variant="ghost"
        className={cn('size-8.5', position === 'current' && 'invisible')}
        onClick={() => onMonthChange(today)}
        title="Today"
        aria-label="Today"
        tabIndex={position === 'current' ? -1 : undefined}
      >
        {position === 'future' ? <CornerUpLeftIcon /> : <CornerUpRightIcon />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="size-8.5"
        onClick={() => onMonthChange(subMonths(month, 1))}
        aria-label="Previous month"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="size-8.5"
        onClick={() => onMonthChange(addMonths(month, 1))}
        aria-label="Next month"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
};

const DateDraftField = ({
  draft,
  onCommit,
}: {
  draft: TransactionDateDraft;
  onCommit: (next: TransactionDateDraft) => void;
}) => {
  const display = formatDateDraft(draft);
  const [text, setText] = useState<string | null>(null);
  const inputValue = text ?? display;

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) onCommit({ operator: draft.operator });
    else {
      const next = parseDateDraftText(draft.operator, trimmed);
      if (next) onCommit(next);
    }
    setText(null);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <Input
        type="text"
        aria-label="Date"
        value={inputValue}
        placeholder="Select date..."
        className={inputValue ? 'pe-8' : undefined}
        onFocus={() => setText(inputValue)}
        onBlur={(event) => commit(event.currentTarget.value)}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.key !== 'Enter') return;
          event.currentTarget.blur();
        }}
      />
      {inputValue ? (
        <button
          type="button"
          aria-label="Clear date"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setText(null);
            onCommit({ operator: draft.operator });
          }}
          className={cn(
            'absolute end-2.5 top-1/2 size-4 -translate-y-1/2 cursor-pointer rounded-xs',
            'opacity-70 transition-opacity hover:opacity-100',
            'ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none'
          )}
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
};

type TransactionDateEditorProps = {
  filter: TransactionDateFilter | null;
  onApply: (filter: TransactionDateFilter | null) => void;
  onCancel: () => void;
};

/** Edits a local draft committed on Apply; mount fresh per editing session. */
export const TransactionDateEditor = ({
  filter,
  onApply,
  onCancel,
}: TransactionDateEditorProps) => {
  const today = useToday();
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState(() => dateFilterToDraft(filter));
  // Presets drive the calendar month explicitly; day clicks must not, or
  // picking a range end in the second visible month would yank the view.
  const [focusMonth, setFocusMonth] = useState(
    () => (draft.start && parseFilterDate(draft.start)) || today
  );
  const [hover, setHover] = useState<string>();

  const selectDay = (day: Date) => {
    setHover(undefined);
    setDraft((current) => draftAfterDay(current, toFilterDate(day)));
  };

  const setOperator = (operator: DateRangeOperator) => {
    setHover(undefined);
    setDraft((current) => ({
      operator,
      start: current.start,
      end: isRangeDateOperator(operator) ? current.end : undefined,
    }));
  };

  const applyPreset = (id: TransactionDatePresetId | 'all') => {
    setHover(undefined);
    if (id === 'all') {
      setDraft({ operator: 'between' });
      return;
    }
    const range = presetDateRange(id, today);
    setDraft({
      operator: 'between',
      start: toFilterDate(range.from),
      end: toFilterDate(range.to),
    });
    setFocusMonth(presetFocusMonth(range, today));
  };

  const commitDraft = (next: TransactionDateDraft) => {
    setHover(undefined);
    setDraft(next);
  };

  const selectedStart = draft.start ? parseFilterDate(draft.start) : undefined;
  const selectedEnd = draft.end ? parseFilterDate(draft.end) : undefined;

  const calendarProps = {
    month: focusMonth,
    onMonthChange: setFocusMonth,
    numberOfMonths: isMobile ? 1 : 2,
    hideNavigation: true,
    showOutsideDays: true,
    today,
    className: 'w-full shrink-0 p-0',
    classNames: CALENDAR_CLASS_NAMES,
  };

  return (
    <>
      <div className="w-full space-y-4 p-3 pb-0 sm:w-[470px]">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-medium">Date</h3>
          <DateOperatorTabs value={draft.operator} onChange={setOperator} />
        </div>
        <div className="flex items-center gap-2">
          <DateDraftField draft={draft} onCommit={commitDraft} />
          <DateMonthNav month={focusMonth} onMonthChange={setFocusMonth} />
        </div>
        {/* Hover paints a preview only. Selection stays the draft, so the
            pressed day is the one Apply stores. */}
        <div onMouseLeave={() => setHover(undefined)}>
          {isRangeDateOperator(draft.operator) ? (
            <Calendar
              mode="range"
              selected={
                selectedStart
                  ? { from: selectedStart, to: selectedEnd }
                  : undefined
              }
              onSelect={(_range, triggerDate) => selectDay(triggerDate)}
              onDayMouseEnter={(date) => setHover(toFilterDate(date))}
              modifiers={{
                preview: (date) => dayInOpenRange(date, draft, hover),
              }}
              modifiersClassNames={{ preview: 'bg-muted' }}
              {...calendarProps}
            />
          ) : (
            <Calendar
              mode="single"
              selected={selectedStart}
              onSelect={(_date, triggerDate) => selectDay(triggerDate)}
              {...calendarProps}
            />
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-3 pt-3">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Separator className="mt-3" />
      <div className="flex justify-end gap-2 p-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!isDateDraftComplete(draft)}
          onClick={() => onApply(draftToDateFilter(draft))}
        >
          Apply
        </Button>
      </div>
    </>
  );
};

type TransactionDateFilterControlProps = {
  filter: DateFilterConfig;
  search: TransactionSearch;
  onChange: (filter: TransactionDateFilter | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const TransactionDateFilterControl = ({
  filter,
  search,
  onChange,
  open,
  onOpenChange,
}: TransactionDateFilterControlProps) => {
  const today = useToday();
  const dateFilter = dateFilterFromSearch(search);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <TransactionFilterTrigger
            icon={filter.icon}
            label={formatTransactionDateFilterLabel(dateFilter, today)}
          />
        }
      />
      <PopoverContent align="start" sideOffset={4} className="w-auto gap-0 p-0">
        <TransactionDateEditor
          filter={dateFilter}
          onApply={(next) => {
            onChange(next);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </PopoverContent>
    </Popover>
  );
};
