import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import { TransactionFilterTrigger } from './TransactionFilterTrigger';
import type { ImportResultFilterConfig } from './transactionFilterConfig';
import type {
  TransactionFilterOption,
  TransactionFilterOptions,
} from './transactionFilterTypes';

/** Sentinel radio value meaning "no filter". */
const ALL_VALUE = '__all__';

type TransactionSingleSelectFilterProps = {
  filter: ImportResultFilterConfig;
  options: TransactionFilterOption[];
  value: TransactionFilterOptions['importValue'];
  onChange: (value: string | undefined) => void;
  /** Controlled open state so applied chips can reopen this menu. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Quick single-select filter — radio dropdown, one value at a time. */
export const TransactionSingleSelectFilter = ({
  filter,
  options,
  value,
  onChange,
  open,
  onOpenChange,
}: TransactionSingleSelectFilterProps) => (
  <DropdownMenu open={open} onOpenChange={onOpenChange}>
    <DropdownMenuTrigger
      render={
        <TransactionFilterTrigger
          icon={filter.icon}
          label={
            options.find((option) => option.value === value)?.label ??
            filter.allLabel
          }
        />
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
          {filter.allLabel}
        </DropdownMenuRadioItem>
        {options.map((option) => (
          <DropdownMenuRadioItem key={option.value} value={option.value}>
            <span className="flex min-w-0 items-center gap-2">
              {option.icon}
              <span className="truncate">{option.label}</span>
            </span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);
