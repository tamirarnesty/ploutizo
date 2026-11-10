import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import type { ReactNode } from 'react';

/** Sentinel radio value meaning "no filter". */
const ALL_VALUE = '__all__';

type TransactionSingleSelectFilterProps = {
  icon: ReactNode;
  options: { value: string; label: string }[];
  /** Selected option value; undefined = the "all" state. */
  value: string | undefined;
  /** Trigger label when nothing is selected, e.g. "All results". */
  allLabel: string;
  onChange: (value: string | undefined) => void;
  /** Controlled open state so applied chips can reopen this menu. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Quick single-select filter — radio dropdown, one value at a time. */
export const TransactionSingleSelectFilter = ({
  icon,
  options,
  value,
  allLabel,
  onChange,
  open,
  onOpenChange,
}: TransactionSingleSelectFilterProps) => {
  const label =
    options.find((option) => option.value === value)?.label ?? allLabel;

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
        <DropdownMenuRadioGroup
          value={value ?? ALL_VALUE}
          onValueChange={(next) =>
            onChange(next === ALL_VALUE ? undefined : next)
          }
        >
          <DropdownMenuRadioItem value={ALL_VALUE}>
            {allLabel}
          </DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
