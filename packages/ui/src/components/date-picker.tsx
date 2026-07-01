'use client';

import { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/button';
import { Calendar } from '@/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import { cn } from '@/lib/utils';

export type DatePickerProps = {
  /** ISO date string (`yyyy-MM-dd`). */
  value?: string;
  onChange: (isoDate: string) => void;
  onBlur?: () => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};

/**
 * Single-date picker built from Popover + Calendar (shadcn date-picker pattern).
 * Form state uses ISO `yyyy-MM-dd` strings; the trigger shows a localized label.
 */
export const DatePicker = ({
  value,
  onChange,
  onBlur,
  id,
  placeholder = 'Pick a date',
  disabled,
  className,
  'aria-label': ariaLabel,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const parsedDate = value ? parseISO(value) : undefined;
  const selectedDate =
    parsedDate && isValid(parsedDate) ? parsedDate : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            id={id}
            variant="outline"
            type="button"
            aria-label={ariaLabel}
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground',
              className
            )}
            onBlur={onBlur}
          />
        }
      >
        <CalendarIcon className="mr-2 size-4" aria-hidden="true" />
        {selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
