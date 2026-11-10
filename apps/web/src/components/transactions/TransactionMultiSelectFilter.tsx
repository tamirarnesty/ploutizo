import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

type TransactionMultiSelectFilterProps = {
  icon: ReactNode;
  options: { value: string; label: string }[];
  /** Selected option values; empty = the "all" state. */
  values: string[];
  /** Non-default operator means the URL carries an advanced filter. */
  operator?: string;
  /** Trigger label when nothing is selected, e.g. "All types". */
  allLabel: string;
  onChange: (values: string[]) => void;
  /** Controlled open state so applied chips can reopen this menu. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Quick multi-select filter — checkbox dropdown, positive match only. */
export const TransactionMultiSelectFilter = ({
  icon,
  options,
  values,
  operator,
  allLabel,
  onChange,
  open,
  onOpenChange,
}: TransactionMultiSelectFilterProps) => {
  const valueSet = useMemo(() => new Set(values), [values]);
  const isCustom = Boolean(operator && operator !== 'is');
  const label = isCustom
    ? 'Custom'
    : values.length === 0
      ? allLabel
      : values
          .map(
            (value) =>
              options.find((option) => option.value === value)?.label ?? value
          )
          .join(', ');

  const handleToggle = (value: string) => {
    onChange(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value]
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-44 gap-1.5 text-xs"
          >
            {icon}
            <span className="truncate">{label}</span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={valueSet.has(option.value)}
              // Keep the menu open while toggling multiple values.
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => handleToggle(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {values.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange([])}>
              Clear
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
