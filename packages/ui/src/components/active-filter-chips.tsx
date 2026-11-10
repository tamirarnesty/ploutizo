'use client';

import { XIcon } from 'lucide-react';
import {
  getFieldsMap,
  getFilterSummary,
  mergeFilterI18n,
} from './filters-utils';
import {
  type Filter,
  type FilterFieldConfig,
  type FilterFieldsConfig,
  type FilterI18nConfig,
} from './filters-types';
import { Badge } from '@/components/badge';
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
        const field = fieldsMap[filter.field] as
          FilterFieldConfig<T> | undefined;
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
          <Badge
            key={filter.id}
            variant="secondary"
            className="h-7 max-w-full gap-1 rounded-full ps-3 pe-1 font-normal"
          >
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(filter)}
                className="flex min-w-0 items-center gap-1 truncate text-start hover:underline"
              >
                {body}
              </button>
            ) : (
              <span className="flex min-w-0 items-center gap-1 truncate">
                {body}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${label} filter`}
              onClick={() => onRemove(filter)}
              className="size-5 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </Badge>
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
