'use client';

import { createContext, use, useCallback, useMemo, useState } from 'react';
import { max, startOfMonth, subMonths } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { type ComponentProps, type ReactNode } from 'react';
import { Button } from '@/components/button';
import { Calendar } from '@/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { cn } from '@/lib/utils';

/** Inclusive bounds; callers convert to and from however they store dates. */
export type DateRangeValue = { from: Date; to: Date };

type DateRangePickerContextValue = {
  open: boolean;
  /** The in-popover selection; committed only on Apply. */
  pending: DateRange | undefined;
  setPending: (range: DateRange | undefined) => void;
  /** The committed range, parsed. */
  committed: DateRange | undefined;
  apply: () => void;
  cancel: () => void;
};

const DateRangePickerContext =
  createContext<DateRangePickerContextValue | null>(null);

export const useDateRangePicker = (): DateRangePickerContextValue => {
  const context = use(DateRangePickerContext);
  if (!context) {
    throw new Error('useDateRangePicker must be used within <DateRangePicker>');
  }
  return context;
};

const toDateRange = (
  value: Partial<DateRangeValue> | undefined
): DateRange | undefined =>
  value?.from || value?.to ? { from: value.from, to: value.to } : undefined;

type DateRangePickerProps = {
  /** The committed range; the calendar opens on it. */
  value?: Partial<DateRangeValue>;
  /** Called with a complete range when Apply is pressed. */
  onApply: (range: DateRangeValue) => void;
  children: ReactNode;
};

/**
 * Range picker built from Popover + Calendar (shadcn range-picker pattern), with the selection held until Apply
 * so each click does not commit. Compose the trigger and content from the parts below.
 */
export const DateRangePicker = ({
  value,
  onApply,
  children,
}: DateRangePickerProps) => {
  const committed = useMemo(() => toDateRange(value), [value]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<DateRange | undefined>(committed);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setPending(committed);
    }
    setOpen(next);
  };

  const apply = useCallback(() => {
    if (!pending?.from || !pending.to) return;
    onApply({ from: pending.from, to: pending.to });
    setOpen(false);
  }, [onApply, pending]);

  const cancel = useCallback(() => {
    setOpen(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      open,
      pending,
      setPending,
      committed,
      apply,
      cancel,
    }),
    [apply, cancel, committed, open, pending]
  );

  return (
    <DateRangePickerContext value={contextValue}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        {children}
      </Popover>
    </DateRangePickerContext>
  );
};

export const DateRangePickerTrigger = PopoverTrigger;

export const DateRangePickerContent = ({
  className,
  align = 'start',
  ...props
}: ComponentProps<typeof PopoverContent>) => (
  <PopoverContent
    data-slot="date-range-picker-content"
    className={cn('w-auto p-0', className)}
    align={align}
    {...props}
  />
);

/** First of the visible months: the committed start, unless that would hide the committed end. */
const startMonthFor = (
  range: DateRange | undefined,
  numberOfMonths: number
): Date | undefined => {
  if (!range?.from) return undefined;
  const fromMonth = startOfMonth(range.from);
  return range.to
    ? max([fromMonth, subMonths(startOfMonth(range.to), numberOfMonths - 1)])
    : fromMonth;
};

export const DateRangePickerCalendar = ({
  numberOfMonths = 2,
  ...props
}: Omit<
  ComponentProps<typeof Calendar>,
  'mode' | 'selected' | 'onSelect' | 'required'
>) => {
  const { pending, setPending, committed } = useDateRangePicker();
  return (
    <Calendar
      mode="range"
      selected={pending}
      onSelect={setPending}
      numberOfMonths={numberOfMonths}
      defaultMonth={startMonthFor(committed, numberOfMonths)}
      {...props}
    />
  );
};

export const DateRangePickerFooter = ({
  className,
  ...props
}: ComponentProps<'div'>) => (
  <div
    data-slot="date-range-picker-footer"
    className={cn(
      'flex justify-end gap-2 border-t border-border px-3 py-2',
      className
    )}
    {...props}
  />
);

export const DateRangePickerCancel = ({
  children = 'Cancel',
  ...props
}: ComponentProps<typeof Button>) => {
  const { cancel } = useDateRangePicker();
  return (
    <Button variant="outline" size="sm" onClick={cancel} {...props}>
      {children}
    </Button>
  );
};

/** Disabled until both ends are picked. */
export const DateRangePickerApply = ({
  children = 'Apply',
  ...props
}: ComponentProps<typeof Button>) => {
  const { pending, apply } = useDateRangePicker();
  return (
    <Button
      size="sm"
      disabled={!pending?.from || !pending.to}
      onClick={apply}
      {...props}
    >
      {children}
    </Button>
  );
};
