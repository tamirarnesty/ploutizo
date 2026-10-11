'use client';

import { useCallback, useMemo } from 'react';

import { FilterOperatorDropdown } from './filter-operator-dropdown';
import { FilterRemoveButton } from './filter-remove-button';
import { FilterValueSelector } from './filter-value-selector';
import { filtersContainerVariants, useFilterContext } from './filters-context';
import { getFieldsMap } from './filters-utils';
import type { Filter, FilterFieldsConfig } from './filters-types';
import { ButtonGroup, ButtonGroupText } from '@/components/button-group';
import { cn } from '@/lib/utils';

interface FiltersContentProps<T = unknown> {
  filters: Filter<T>[];
  fields: FilterFieldsConfig<T>;
  onChange: (filters: Filter<T>[]) => void;
}

export const FiltersContent = <T = unknown,>({
  filters,
  fields,
  onChange,
}: FiltersContentProps<T>) => {
  const context = useFilterContext();
  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields]);

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates };
            if (
              updates.operator === 'empty' ||
              updates.operator === 'not_empty'
            ) {
              updatedFilter.values = [] as T[];
            }
            return updatedFilter;
          }
          return filter;
        })
      );
    },
    [filters, onChange]
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId));
    },
    [filters, onChange]
  );

  return (
    <div
      className={cn(
        filtersContainerVariants({
          variant: context.variant,
          size: context.size,
        }),
        context.className
      )}
    >
      {filters.map((filter) => {
        const field = fieldsMap[filter.field];
        if (!field) return null;

        return (
          <ButtonGroup key={filter.id}>
            <ButtonGroupText>
              {field.icon && field.icon}
              {field.label}
            </ButtonGroupText>

            <FilterOperatorDropdown<T>
              field={field}
              operator={filter.operator}
              values={filter.values}
              onChange={(operator) => updateFilter(filter.id, { operator })}
            />

            <FilterValueSelector<T>
              field={field}
              values={filter.values}
              onChange={(values) => updateFilter(filter.id, { values })}
              operator={filter.operator}
              autoFocus={false}
            />

            <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
          </ButtonGroup>
        );
      })}
    </div>
  );
};
