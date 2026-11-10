'use client';

import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { FilterOptionList } from './filter-option-list';
import {
  createPinnedFilterId,
  flattenFields,
  getDefaultFilterOperator,
  getFieldsMap,
  getFilterSummary,
  getOperatorsForField,
  isFilterValueActive,
  mergeFilterI18n,
} from './filters-utils';
import {
  type Filter,
  type FilterFieldConfig,
  type FilterFieldsConfig,
  type FilterI18nConfig,
} from './filters-types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/collapsible';
import { Input } from '@/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/toggle-group';

const EMPTY_VALUE_OPERATORS = new Set(['empty', 'not_empty']);

const FilterOperatorPills = ({
  operators,
  active,
  onChange,
}: {
  operators: { value: string; label: string }[];
  active: string;
  onChange: (operator: string) => void;
}) => (
  <ToggleGroup
    value={[active]}
    onValueChange={(values) => {
      const next = values.at(-1);
      if (next) onChange(next);
    }}
    variant="outline"
    size="sm"
    spacing={1}
    className="flex-wrap"
  >
    {operators.map((operator) => (
      <ToggleGroupItem key={operator.value} value={operator.value}>
        {operator.label}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);

interface FilterValueEditorProps<T = unknown> {
  field: FilterFieldConfig<T>;
  filter: Filter<T>;
  onValuesChange: (values: T[]) => void;
  onOperatorValuesChange: (operator: string, values: T[]) => void;
}

const FilterValueEditor = <T = unknown,>({
  field,
  filter,
  onValuesChange,
  onOperatorValuesChange,
}: FilterValueEditorProps<T>) => {
  const isMulti = field.type === 'multiselect' || filter.values.length > 1;

  const handleOptionToggle = (value: T) => {
    if (isMulti) {
      const next = filter.values.includes(value)
        ? filter.values.filter((v) => v !== value)
        : [...filter.values, value];
      onValuesChange(next);
    } else {
      onValuesChange(
        filter.values.length === 1 && filter.values[0] === value ? [] : [value]
      );
    }
  };

  if (field.customRenderer) {
    return field.customRenderer({
      field,
      values: filter.values,
      onChange: onValuesChange,
      operator: filter.operator,
      onOperatorValuesChange,
    });
  }

  if (field.type === 'text') {
    return (
      <Input
        type="text"
        value={String(filter.values[0] ?? '')}
        onChange={(event) => onValuesChange([event.target.value as T])}
        placeholder={field.placeholder}
      />
    );
  }

  return (
    <FilterOptionList
      options={field.options ?? []}
      values={filter.values}
      multi={isMulti}
      onToggle={handleOptionToggle}
    />
  );
};

interface FilterFieldSectionProps<T = unknown> {
  filter: Filter<T>;
  field: FilterFieldConfig<T>;
  i18n: FilterI18nConfig;
  emptyLabel: string;
  getSummary?: (filter: Filter<T>) => string | undefined;
  forceExpanded?: boolean;
  onOperatorChange: (operator: string) => void;
  onValuesChange: (values: T[]) => void;
  onOperatorValuesChange: (operator: string, values: T[]) => void;
  onClear: () => void;
}

const FilterFieldSection = <T = unknown,>({
  filter,
  field,
  i18n,
  emptyLabel,
  getSummary,
  forceExpanded = false,
  onOperatorChange,
  onValuesChange,
  onOperatorValuesChange,
  onClear,
}: FilterFieldSectionProps<T>) => {
  const [expanded, setExpanded] = useState(
    () => forceExpanded || isFilterValueActive(filter)
  );
  const [wasForced, setWasForced] = useState(forceExpanded);

  // Expand when the panel targets this field (chip click); the user can still
  // collapse it afterwards because the flag only fires on the transition.
  if (forceExpanded !== wasForced) {
    setWasForced(forceExpanded);
    if (forceExpanded) setExpanded(true);
  }

  const operators = getOperatorsForField(field, filter.values, i18n);
  const showValueEditor =
    !EMPTY_VALUE_OPERATORS.has(filter.operator) && field.type !== 'separator';
  const summary =
    getSummary?.(filter) ?? getFilterSummary(filter, field, i18n, emptyLabel);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="border-b border-border/60 last:border-b-0">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm hover:bg-accent/50">
          <span className="shrink-0 font-medium">{field.label}</span>
          <span
            className="min-w-0 flex-1 truncate text-muted-foreground"
            title={summary}
          >
            {summary}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="flex flex-col gap-2.5 px-3 pb-3">
          {operators.length > 1 ? (
            <FilterOperatorPills
              operators={operators}
              active={filter.operator}
              onChange={onOperatorChange}
            />
          ) : null}

          {showValueEditor ? (
            <FilterValueEditor
              field={field}
              filter={filter}
              onValuesChange={onValuesChange}
              onOperatorValuesChange={onOperatorValuesChange}
            />
          ) : null}

          {isFilterValueActive(filter) ? (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={onClear}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface FilterPanelProps<T = unknown> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** One editable row per field; fields without `key` or with type `separator` are skipped. */
  fields: FilterFieldsConfig<T>;
  /** Materialized filters — one entry per field (empty defaults are fine). */
  filters: Filter<T>[];
  onChange: (filters: Filter<T>[]) => void;
  /** Desktop popover anchor. Ignored on mobile, where the panel renders as a bottom sheet. */
  trigger?: ReactElement;
  title?: string;
  i18n?: Partial<FilterI18nConfig>;
  /** Optional sticky footer (e.g. a result count or secondary actions). */
  footer?: ReactNode;
  /** Override the per-filter summary text (e.g. domain-aware date labels). */
  getSummary?: (filter: Filter<T>) => string | undefined;
  /** Field key to expand when the panel opens (e.g. after clicking an applied chip). */
  focusFieldKey?: string;
  emptyLabel?: string;
}

/**
 * Filter editor panel: an anchored popover on desktop and a bottom sheet on mobile.
 * Every field renders as an expandable section with operator pills and an inline
 * value editor — no nested popovers, so it behaves identically on both viewports.
 */
export const FilterPanel = <T = unknown,>({
  open,
  onOpenChange,
  fields,
  filters,
  onChange,
  trigger,
  title = 'Filters',
  i18n,
  footer,
  getSummary,
  focusFieldKey,
  emptyLabel = 'Any',
}: FilterPanelProps<T>) => {
  const isMobile = useIsMobile();
  const mergedI18n = useMemo(() => mergeFilterI18n(i18n), [i18n]);
  const flatFields = useMemo(
    () =>
      flattenFields(fields).filter(
        (field) => field.key && field.type !== 'separator'
      ),
    [fields]
  );
  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields]);
  // `filters` round-trips through the URL, so it lags behind rapid edits.
  // The draft keeps section state optimistic; it reconciles once the
  // committed filters catch up (or an external change lands).
  const [draftFilters, setDraftFilters] = useState<Filter<T>[] | null>(null);
  const filtersKey = JSON.stringify(
    filters.map((filter) => [filter.id, filter.operator, filter.values])
  );
  useEffect(() => {
    setDraftFilters(null);
  }, [filtersKey]);
  const effectiveFilters = draftFilters ?? filters;
  const filtersMap = useMemo(
    () => new Map(effectiveFilters.map((filter) => [filter.field, filter])),
    [effectiveFilters]
  );

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      const next = effectiveFilters.map((filter) => {
        if (filter.id !== filterId) return filter;
        const updated = { ...filter, ...updates };
        if (updates.operator !== undefined && !updates.values) {
          const fieldConfig = fieldsMap[filter.field] as
            FilterFieldConfig<T> | undefined;
          const migrate = fieldConfig?.migrateValues;
          if (migrate) {
            updated.values = migrate(
              filter.operator,
              updates.operator,
              filter.values
            );
          }
        }
        if (updates.operator === 'empty' || updates.operator === 'not_empty') {
          updated.values = [] as T[];
        }
        return updated;
      });
      setDraftFilters(next);
      onChange(next);
    },
    [fieldsMap, effectiveFilters, onChange]
  );

  const sections = flatFields.map((field) => {
    const key = field.key as string;
    const filter =
      filtersMap.get(key) ??
      ({
        id: createPinnedFilterId(key),
        field: key,
        operator: getDefaultFilterOperator(field),
        values: [],
      } satisfies Filter<T>);
    return (
      <FilterFieldSection
        key={key}
        filter={filter}
        field={field}
        i18n={mergedI18n}
        emptyLabel={emptyLabel}
        getSummary={getSummary}
        forceExpanded={focusFieldKey === key}
        onOperatorChange={(operator) => updateFilter(filter.id, { operator })}
        onValuesChange={(values) => updateFilter(filter.id, { values })}
        onOperatorValuesChange={(operator, values) =>
          updateFilter(filter.id, { operator, values })
        }
        onClear={() => {
          const empty = fieldsMap[key] as FilterFieldConfig<T> | undefined;
          const next = effectiveFilters.map((f) =>
            f.field === key
              ? {
                  id: createPinnedFilterId(key),
                  field: key,
                  operator: empty ? getDefaultFilterOperator(empty) : 'is',
                  values: [],
                }
              : f
          );
          setDraftFilters(next);
          onChange(next);
        }}
      />
    );
  });

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[85dvh] gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">{sections}</div>
          {footer ? (
            <div className="border-t border-border px-4 py-3">{footer}</div>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[26rem] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
      >
        <div className="border-b border-border px-3 py-2.5 text-sm font-medium">
          {title}
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{sections}</div>
        {footer ? (
          <div className="border-t border-border px-3 py-2.5">{footer}</div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
