'use client';

import { CheckIcon } from 'lucide-react';

import { useFilterContext } from './filters-context';
import { getOperatorsForField } from './filters-utils';
import type { FilterFieldConfig } from './filters-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';

interface FilterOperatorDropdownProps<T = unknown> {
  field: FilterFieldConfig<T>;
  operator: string;
  values: T[];
  onChange: (operator: string) => void;
}

export const FilterOperatorDropdown = <T = unknown,>({
  field,
  operator,
  values,
  onChange,
}: FilterOperatorDropdownProps<T>) => {
  const context = useFilterContext();
  const operators = getOperatorsForField(field, values, context.i18n);

  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ||
    context.i18n.helpers.formatOperator(operator);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={context.size}
            className="text-muted-foreground hover:text-foreground"
          >
            {operatorLabel}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            key={op.value}
            onClick={() => onChange(op.value)}
            className={cn(
              'flex items-center justify-between data-highlighted:bg-accent data-highlighted:text-accent-foreground'
            )}
          >
            <span>{op.label}</span>
            <CheckIcon
              className={cn(
                'ms-auto text-primary',
                op.value === operator ? 'opacity-100' : 'opacity-0'
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
