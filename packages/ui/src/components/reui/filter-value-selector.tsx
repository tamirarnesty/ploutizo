'use client';

import { FilterInput } from './filter-input';
import { SelectOptionsPopover } from './select-options-popover';
import { useFilterContext } from './filters-context';
import type { FilterFieldConfig } from './filters-types';
import { ButtonGroupText } from '@/components/button-group';
import { cn } from '@/lib/utils';

interface FilterValueSelectorProps<T = unknown> {
  field: FilterFieldConfig<T>;
  values: T[];
  onChange: (values: T[]) => void;
  operator: string;
  autoFocus?: boolean;
}

export const FilterValueSelector = <T = unknown,>({
  field,
  values,
  onChange,
  operator,
  autoFocus,
}: FilterValueSelectorProps<T>) => {
  useFilterContext();

  if (operator === 'empty' || operator === 'not_empty') {
    return null;
  }

  if (field.customRenderer) {
    return (
      <ButtonGroupText className="bg-background text-start whitespace-nowrap outline-hidden hover:bg-accent aria-expanded:bg-accent dark:bg-input/30">
        {field.customRenderer({ field, values, onChange, operator })}
      </ButtonGroupText>
    );
  }

  if (field.type === 'text') {
    return (
      <FilterInput
        type="text"
        value={(values[0] as string) || ''}
        onChange={(e) => onChange([e.target.value] as T[])}
        placeholder={field.placeholder}
        pattern={field.pattern}
        field={field}
        className={cn('w-36', field.className)}
        autoFocus={autoFocus}
      />
    );
  }

  if (field.type === 'select' || field.type === 'multiselect') {
    return (
      <SelectOptionsPopover field={field} values={values} onChange={onChange} />
    );
  }

  return (
    <SelectOptionsPopover field={field} values={values} onChange={onChange} />
  );
};
