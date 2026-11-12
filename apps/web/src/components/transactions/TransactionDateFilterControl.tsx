import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@ploutizo/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import { Separator } from '@ploutizo/ui/components/separator';
import { DateSelector } from '@ploutizo/ui/components/date-selector';
import { useToday } from '@ploutizo/ui/hooks/use-today';
import type { DateSelectorValue } from '@ploutizo/ui/components/date-selector';
import { TransactionFilterTrigger } from './TransactionFilterTrigger';
import {
  TRANSACTION_DATE_PRESETS,
  dateFilterFromSearch,
  dateFilterToSelectorValue,
  formatTransactionDateFilterLabel,
  isDateSelectionComplete,
  presetDateRange,
  presetFocusMonth,
  selectorValueToDateFilter,
} from './transactionDateFilter';
import type {
  TransactionDateFilter,
  TransactionDatePresetId,
} from './transactionDateFilter';
import type { DateFilterConfig } from './transactionFilterConfig';
import type { TransactionSearch } from './transactionSearch';

const DATE_PRESETS = [
  ...TRANSACTION_DATE_PRESETS,
  { id: 'all', label: 'All time' },
] as const;

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
  const [staged, setStaged] = useState<DateSelectorValue>(() =>
    dateFilterToSelectorValue(filter)
  );
  // Presets drive the calendar month explicitly; day clicks must not, or
  // picking a range end in the second visible month would yank the view.
  const [focusMonth, setFocusMonth] = useState<Date>();

  const applyPreset = (id: TransactionDatePresetId | 'all') => {
    if (id === 'all') {
      setStaged({ operator: 'between' });
      return;
    }
    const range = presetDateRange(id, today);
    setStaged({
      operator: 'between',
      startDate: range.from,
      endDate: range.to,
    });
    setFocusMonth(presetFocusMonth(range, today));
  };

  return (
    <>
      <div className="p-3 pb-0">
        <DateSelector
          value={staged}
          onChange={setStaged}
          label="Date"
          inputHint={`Try: ${format(today, 'MMM d, yyyy')}`}
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
      <div className="flex justify-end gap-2 p-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!isDateSelectionComplete(staged)}
          onClick={() => onApply(selectorValueToDateFilter(staged))}
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
