import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@ploutizo/ui/components/calendar';
import { Button } from '@ploutizo/ui/components/button';
import { cn } from '@ploutizo/ui/lib/utils';
import {
  TRANSACTION_DATE_OPERATORS,
  TRANSACTION_DATE_PRESETS,
  dateFilterKind,
  formatTransactionDateFilterLabel,
  isRangeDateOperator,
  isSingleBoundDateOperator,
  migrateDateFilterValues,
  presetDateRange,
} from './transactionDateFilter';
import type { TransactionDatePresetId } from './transactionDateFilter';
import type { DateRange } from 'react-day-picker';

const toFilterValue = (date: Date) => format(date, 'yyyy-MM-dd');

const parseFilterDate = (value: string): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const toDateRange = (values: string[]): DateRange | undefined => {
  const from = parseFilterDate(values[0] ?? '');
  const to = parseFilterDate(values[1] ?? '');
  return from || to ? { from, to } : undefined;
};

type TransactionDateEditorProps = {
  operator: string;
  values: string[];
  /** Intermediate edits (operator pills) — the host stays open. */
  onChange: (next: { operator: string; values: string[] }) => void;
  /** Complete selections (preset, single day, range Apply). Defaults to onChange. */
  onCommit?: (next: { operator: string; values: string[] }) => void;
  numberOfMonths?: number;
  /** Hide the operator pills when the host already renders its own operator picker. */
  showOperators?: boolean;
};

/**
 * Inline date filter editor: preset shortcuts, operator pills, and a calendar.
 * Single-bound operators commit on day click; range operators hold a pending
 * selection until Apply. Used by the quick-filter popover and the panel section.
 */
export const TransactionDateEditor = ({
  operator,
  values,
  onChange,
  onCommit,
  numberOfMonths = 1,
  showOperators = true,
}: TransactionDateEditorProps) => {
  const commit = onCommit ?? onChange;
  const isRange = isRangeDateOperator(operator);
  const committedRange = toDateRange(values);
  const [pending, setPending] = useState<DateRange | undefined>(committedRange);
  const committedKey = `${values[0] ?? ''}|${values[1] ?? ''}`;
  const [prevCommittedKey, setPrevCommittedKey] = useState(committedKey);

  // Reset the pending calendar selection when the committed filter changes
  // (adjust-state-during-render — avoids an effect and a stale-range warning).
  if (committedKey !== prevCommittedKey) {
    setPrevCommittedKey(committedKey);
    setPending(committedRange);
  }

  const activePreset =
    operator === 'between' ? dateFilterKind(operator, values) : 'custom';

  const applyPreset = (id: TransactionDatePresetId | 'all') => {
    if (id === 'all') {
      commit({ operator: 'between', values: [] });
      return;
    }
    const range = presetDateRange(id);
    commit({
      operator: 'between',
      values: [toFilterValue(range.from), toFilterValue(range.to)],
    });
  };

  const handleOperatorChange = (nextOperator: string) => {
    onChange({
      operator: nextOperator,
      values: migrateDateFilterValues(operator, nextOperator, values),
    });
  };

  const handleSingleSelect = (date: Date | undefined) => {
    if (!date) return;
    commit({ operator, values: [toFilterValue(date)] });
  };

  const handleRangeApply = () => {
    if (!pending?.from || !pending.to) return;
    commit({
      operator,
      values: [toFilterValue(pending.from), toFilterValue(pending.to)],
    });
  };

  const singleSelected = isSingleBoundDateOperator(operator)
    ? parseFilterDate(values[0] ?? '')
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1">
        {TRANSACTION_DATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={activePreset === preset.id}
            onClick={() => applyPreset(preset.id)}
            className={cn(
              'rounded-md border px-2 py-1.5 text-xs transition-colors',
              activePreset === preset.id
                ? 'border-primary/40 bg-primary/10 font-medium text-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={activePreset === 'all'}
          onClick={() => applyPreset('all')}
          className={cn(
            'rounded-md border px-2 py-1.5 text-xs transition-colors',
            activePreset === 'all'
              ? 'border-primary/40 bg-primary/10 font-medium text-foreground'
              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          All time
        </button>
      </div>

      {showOperators ? (
        <div className="flex flex-wrap gap-1">
          {TRANSACTION_DATE_OPERATORS.map((op) => {
            const active = op.value === operator;
            return (
              <button
                key={op.value}
                type="button"
                aria-pressed={active}
                onClick={() => handleOperatorChange(op.value)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/10 font-medium text-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {op.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {isRange ? (
        <>
          <Calendar
            mode="range"
            numberOfMonths={numberOfMonths}
            selected={pending}
            onSelect={setPending}
            defaultMonth={committedRange?.from}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              {formatTransactionDateFilterLabel(operator, values)}
            </span>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setPending(committedRange)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="xs"
                disabled={!pending?.from || !pending.to}
                onClick={handleRangeApply}
              >
                Apply
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Calendar
          mode="single"
          numberOfMonths={numberOfMonths}
          selected={singleSelected}
          onSelect={handleSingleSelect}
          defaultMonth={singleSelected}
        />
      )}
    </div>
  );
};
