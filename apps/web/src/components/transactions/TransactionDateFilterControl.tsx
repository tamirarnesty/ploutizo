import { useState } from 'react';
import { CalendarDaysIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import { Separator } from '@ploutizo/ui/components/separator';
import { DateSelector } from '@ploutizo/ui/components/date-selector';
import type {
  DateSelectorI18nConfig,
  DateSelectorValue,
} from '@ploutizo/ui/components/date-selector';
import {
  TRANSACTION_DATE_PRESETS,
  dateFilterFromSearch,
  filterToSelectorValue,
  formatTransactionDateFilterLabel,
  presetDateRange,
  selectorValueToFilter,
} from './transactionDateFilter';
import type { TransactionSearch } from './transactionSearch';

const DATE_SELECTOR_I18N = {
  filterTypes: {
    is: 'Is',
    isNot: 'Is not',
    before: 'Before',
    after: 'After',
    between: 'Between',
    notBetween: 'Not between',
  },
} satisfies Partial<DateSelectorI18nConfig>;

type TransactionDateFilterControlProps = {
  search: TransactionSearch;
  onChange: (next: { operator: string; values: string[] }) => void;
  /** Controlled open state so applied chips can reopen this popover. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DATE_PRESETS = [
  ...TRANSACTION_DATE_PRESETS,
  { id: 'all', label: 'All time' },
] as const;

type DatePresetId = (typeof DATE_PRESETS)[number]['id'];

/** Staged editor mounted fresh each time the popover opens. */
export const TransactionDatePopoverBody = ({
  operator,
  values,
  onApply,
}: {
  operator: string;
  values: string[];
  /** `null` means cancel — nothing is committed. */
  onApply: (next: { operator: string; values: string[] } | null) => void;
}) => {
  const [staged, setStaged] = useState<DateSelectorValue>(() =>
    filterToSelectorValue({ operator, values })
  );
  // Presets drive the calendar month explicitly; day clicks must not, or
  // picking a range end in the second visible month would yank the view.
  const [focusMonth, setFocusMonth] = useState<Date>();
  const committed = selectorValueToFilter(staged);

  const applyPreset = (id: DatePresetId) => {
    const range = id === 'all' ? undefined : presetDateRange(id);
    setStaged({
      operator: 'between',
      startDate: range?.from,
      endDate: range?.to,
    });
    // Ranges containing today (e.g. this year) keep the default view;
    // past/future ranges anchor on the end so it stays visible.
    const today = new Date();
    const anchor =
      range && today >= range.from && today <= range.to
        ? today
        : (range?.to ?? today);
    setFocusMonth(anchor);
  };

  return (
    <>
      <div className="p-3 pb-0">
        <DateSelector
          value={staged}
          onChange={setStaged}
          label="Date"
          i18n={DATE_SELECTOR_I18N}
          inputHint="Try: Nov 5, 2026"
          dayDateFormat="MMM d, yyyy"
          month={focusMonth}
          onMonthChange={setFocusMonth}
        />
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
      <div className="flex justify-end gap-2 p-3 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onApply(null)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={committed === null}
          onClick={() => committed && onApply(committed)}
        >
          Apply
        </Button>
      </div>
    </>
  );
};

/** Quick date filter — staged popover with calendar, presets, and operators. */
export const TransactionDateFilterControl = ({
  search,
  onChange,
  open,
  onOpenChange,
}: TransactionDateFilterControlProps) => {
  const state = dateFilterFromSearch(search);
  const label = formatTransactionDateFilterLabel(state.operator, state.values);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-44 gap-1.5 text-xs"
          >
            <CalendarDaysIcon className="size-3.5" />
            <span className="truncate">{label}</span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" sideOffset={4} className="w-auto gap-0 p-0">
        <TransactionDatePopoverBody
          operator={state.operator}
          values={state.values}
          onApply={(next) => {
            if (next) onChange(next);
            onOpenChange(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
