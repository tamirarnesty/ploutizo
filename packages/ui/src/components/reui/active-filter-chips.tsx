'use client';

import { XIcon } from 'lucide-react';
import {
  getFieldsMap,
  getFilterSummary,
  mergeFilterI18n,
} from './filters-utils';
import type {
  Filter,
  FilterFieldsConfig,
  FilterI18nConfig,
} from './filters-types';
import { Button } from '@/components/button';
import { cn } from '@/lib/utils';

interface ActiveFilterChipsProps<T = unknown> {
  /** Active filters only — the component renders nothing when empty. */
  filters: Filter<T>[];
  fields: FilterFieldsConfig<T>;
  onRemove: (filter: Filter<T>) => void;
  /** When provided, the chip body becomes a button (e.g. reopen the panel focused on the field). */
  onSelect?: (filter: Filter<T>) => void;
  onClearAll?: () => void;
  i18n?: Partial<FilterI18nConfig>;
  /** Override per-filter summary text (e.g. domain-aware date labels). */
  getSummary?: (filter: Filter<T>) => string | undefined;
  emptyLabel?: string;
  className?: string;
}

/** Compact applied-filter chips with per-chip remove and an optional Clear all. */
export const ActiveFilterChips = <T = unknown,>({
  filters,
  fields,
  onRemove,
  onSelect,
  onClearAll,
  i18n,
  getSummary,
  emptyLabel = 'Any',
  className,
}: ActiveFilterChipsProps<T>) => {
  const mergedI18n = mergeFilterI18n(i18n);
  const fieldsMap = getFieldsMap(fields);

  if (filters.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {filters.map((filter) => {
        const field = fieldsMap[filter.field];
        if (!field?.key) return null;
        const label = field.label ?? filter.field;
        const summary =
          getSummary?.(filter) ??
          getFilterSummary(filter, field, mergedI18n, emptyLabel);
        const body = (
          <>
            <span className="text-muted-foreground">{label}:</span>{' '}
            <span className="font-medium">{summary}</span>
          </>
        );
        return (
          <span
            key={filter.id}
            className="inline-flex h-7 items-center gap-0.5 rounded-full border border-border bg-muted/40 ps-3 pe-1 text-xs"
          >
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(filter)}
                className="flex h-full min-w-0 items-center gap-1 rounded-full ps-0 pe-1 hover:underline"
              >
                <span className="truncate">{body}</span>
              </button>
            ) : (
              <span className="flex min-w-0 items-center gap-1 truncate">
                {body}
              </span>
            )}
            <button
              type="button"
              aria-label={`Remove ${label} filter`}
              onClick={() => onRemove(filter)}
              className="-me-1 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <XIcon aria-hidden="true" className="size-3" />
            </button>
          </span>
        );
      })}
      {onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 px-2 text-muted-foreground"
          onClick={onClearAll}
        >
          Clear all
        </Button>
      ) : null}
    </div>
  );
};
