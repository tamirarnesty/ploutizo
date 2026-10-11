'use client';

import { useMemo } from 'react';
import { useRender } from '@base-ui/react/use-render';
import { type Hotkey } from '@tanstack/react-hotkeys';

import { FilterChip } from './filter-chip';
import { FiltersAddMenu } from './filters-add-menu';
import { EMPTY_PINNED_FIELD_KEYS } from './filters-constants';
import { FilterContext, filtersContainerVariants } from './filters-context';
import { createPinnedFilterId } from './filters-utils';
import { useFiltersBar } from './use-filters-bar';
import type React from 'react';
import type {
  Filter,
  FilterFieldsConfig,
  FilterI18nConfig,
} from './filters-types';
import { cn } from '@/lib/utils';

export { FiltersContent } from './filters-content';

interface FiltersProps<T = unknown> {
  filters: Filter<T>[];
  fields: FilterFieldsConfig<T>;
  onChange: (filters: Filter<T>[]) => void;
  className?: string;
  variant?: 'solid' | 'default';
  size?: 'sm' | 'default' | 'lg';
  radius?: 'default' | 'full';
  i18n?: Partial<FilterI18nConfig>;
  showSearchInput?: boolean;
  trigger?: React.ReactNode;
  allowMultiple?: boolean;
  menuPopupClassName?: string;
  collapseAddButton?: boolean;
  enableShortcut?: boolean;
  shortcutKey?: Hotkey;
  pinnedFieldKeys?: string[];
  getPinnedFilterId?: (fieldKey: string) => string;
}

export const Filters = <T = unknown,>({
  filters,
  fields,
  onChange,
  className,
  variant = 'default',
  size = 'default',
  radius = 'default',
  i18n,
  showSearchInput = true,
  trigger,
  allowMultiple = true,
  menuPopupClassName,
  enableShortcut = false,
  shortcutKey = 'F',
  pinnedFieldKeys = EMPTY_PINNED_FIELD_KEYS,
  getPinnedFilterId = createPinnedFilterId,
}: FiltersProps<T>) => {
  const bar = useFiltersBar<T>({
    filters,
    fields,
    onChange,
    i18n,
    allowMultiple,
    enableShortcut,
    shortcutKey,
    pinnedFieldKeys,
    getPinnedFilterId,
  });

  const triggerButton = useRender({
    render: trigger as React.ReactElement,
    defaultTagName: 'button',
  });

  const contextValue = useMemo(
    () => ({
      variant,
      size,
      radius,
      i18n: bar.mergedI18n,
      className,
      trigger,
      allowMultiple,
    }),
    [variant, size, radius, bar.mergedI18n, className, trigger, allowMultiple]
  );

  return (
    <FilterContext.Provider value={contextValue}>
      <div
        className={cn(filtersContainerVariants({ variant, size }), className)}
      >
        {bar.pinnedFieldKeys.map((fieldKey) => {
          const filter = bar.resolvePinnedFilter(fieldKey);
          if (!filter) return null;
          const field = bar.fieldsMap[filter.field];
          if (!field) return null;

          return (
            <FilterChip
              key={filter.id}
              filter={filter}
              field={field}
              pinned={true}
              autoFocusValue={filter.id === bar.lastAddedFilterId}
              onOperatorChange={(operator) =>
                bar.updateFilter(filter.id, { operator })
              }
              onValuesChange={(values) =>
                bar.updateFilter(filter.id, { values })
              }
              onRemove={() => bar.resetPinnedFilter(filter.field)}
            />
          );
        })}

        {bar.selectableFields.length > 0 && (
          <FiltersAddMenu
            open={bar.addFilterOpen}
            onOpenChange={bar.handleAddFilterOpenChange}
            triggerButton={triggerButton}
            menuPopupClassName={menuPopupClassName}
            showSearchInput={showSearchInput}
            mergedI18n={bar.mergedI18n}
            rootInputRef={bar.rootInputRef}
            rootId={bar.rootId}
            menuSearchInput={bar.menuSearchInput}
            onMenuSearchInputChange={bar.setMenuSearchInput}
            activeMenu={bar.activeMenu}
            onActiveMenuChange={bar.setActiveMenu}
            openSubMenu={bar.openSubMenu}
            onOpenSubMenuChange={bar.setOpenSubMenu}
            onHighlightedIndexChange={bar.setHighlightedIndex}
            displayHighlightedIndex={bar.displayHighlightedIndex}
            addFilterOpen={bar.addFilterOpen}
            filteredFields={bar.filteredFields}
            enableShortcut={enableShortcut}
            shortcutKey={shortcutKey}
            onAddFilter={bar.addFilter}
            onCloseMenu={() => bar.setAddFilterOpen(false)}
            filters={bar.filters}
            sessionFilterIds={bar.sessionFilterIds}
            onSubmenuToggle={bar.handleSubmenuToggle}
          />
        )}

        {bar.trailingFilters.map((filter) => {
          const field = bar.fieldsMap[filter.field];
          if (!field) return null;

          return (
            <FilterChip
              key={filter.id}
              filter={filter}
              field={field}
              pinned={false}
              autoFocusValue={filter.id === bar.lastAddedFilterId}
              onOperatorChange={(operator) =>
                bar.updateFilter(filter.id, { operator })
              }
              onValuesChange={(values) =>
                bar.updateFilter(filter.id, { values })
              }
              onRemove={() => bar.removeFilter(filter.id)}
            />
          );
        })}
      </div>
    </FilterContext.Provider>
  );
};
