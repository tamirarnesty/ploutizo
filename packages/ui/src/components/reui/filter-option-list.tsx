'use client';

import { CheckIcon } from 'lucide-react';
import type { FilterOption } from './filters-types';
import { cn } from '@/lib/utils';

interface FilterOptionListProps<T = unknown> {
  options: FilterOption<T>[];
  values: T[];
  /** Called with the toggled option value; the parent decides single- vs multi-select semantics. */
  onToggle: (value: T) => void;
  /** Render checkboxes instead of check marks for multi-value fields. */
  multi?: boolean;
  /** Optional reset row shown first while values are selected. */
  clearLabel?: string;
  onClear?: () => void;
  className?: string;
}

/** Inline option list for filter editors — no popover of its own, so it is safe inside panels and sheets. */
export const FilterOptionList = <T = unknown,>({
  options,
  values,
  onToggle,
  multi = false,
  clearLabel,
  onClear,
  className,
}: FilterOptionListProps<T>) => {
  const valueSet = new Set(values);
  const hasSelection = values.length > 0;

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {clearLabel && hasSelection && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="flex w-full items-center rounded-md px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {clearLabel}
        </button>
      ) : null}
      <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
        {options.map((option) => {
          const selected = valueSet.has(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(option.value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent',
                selected && 'bg-accent/60 font-medium'
              )}
            >
              {option.icon ? (
                <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                  {option.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {multi ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input'
                  )}
                >
                  {selected ? <CheckIcon className="size-3" /> : null}
                </span>
              ) : (
                <CheckIcon
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0',
                    selected ? 'opacity-100' : 'opacity-0'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
