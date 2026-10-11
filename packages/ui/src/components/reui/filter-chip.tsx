'use client';

import { FilterOperatorDropdown } from './filter-operator-dropdown';
import { FilterRemoveButton } from './filter-remove-button';
import { FilterValueSelector } from './filter-value-selector';
import { isFilterValueActive } from './filters-utils';
import type { Filter, FilterFieldConfig } from './filters-types';
import { ButtonGroup, ButtonGroupText } from '@/components/button-group';

interface FilterChipProps<T = unknown> {
  filter: Filter<T>;
  field: FilterFieldConfig<T>;
  pinned: boolean;
  autoFocusValue: boolean;
  onOperatorChange: (operator: string) => void;
  onValuesChange: (values: T[]) => void;
  onRemove: () => void;
}

export const FilterChip = <T = unknown,>({
  filter,
  field,
  pinned,
  autoFocusValue,
  onOperatorChange,
  onValuesChange,
  onRemove,
}: FilterChipProps<T>) => {
  const showRemove = pinned ? isFilterValueActive(filter) : true;

  return (
    <ButtonGroup>
      <ButtonGroupText className="bg-background dark:bg-input/30">
        {field.icon && field.icon}
        {field.label}
      </ButtonGroupText>
      <FilterOperatorDropdown<T>
        field={field}
        operator={filter.operator}
        values={filter.values}
        onChange={onOperatorChange}
      />
      <FilterValueSelector<T>
        field={field}
        values={filter.values}
        operator={filter.operator}
        onChange={onValuesChange}
        autoFocus={autoFocusValue}
      />
      {showRemove && <FilterRemoveButton onClick={onRemove} />}
    </ButtonGroup>
  );
};
