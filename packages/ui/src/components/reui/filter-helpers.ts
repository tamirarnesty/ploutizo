import { type Filter, type FilterFieldConfig } from '@/components/reui/filters';

/** Runtime filter helpers. They live outside `filters.tsx` so that module only exports components. */

export const getDefaultFilterOperator = <T>(
  field: FilterFieldConfig<T>
): string =>
  field.defaultOperator || (field.type === 'multiselect' ? 'is_any_of' : 'is');

export const createPinnedFilterId = (fieldKey: string): string =>
  `filter-${fieldKey}`;

export const isFilterValueActive = <T>(filter: Filter<T>): boolean => {
  if (filter.operator === 'empty' || filter.operator === 'not_empty') {
    return true;
  }
  return filter.values.some((value) => String(value ?? '').trim().length > 0);
};
