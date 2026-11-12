import { Fragment } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import { TransactionFilterTrigger } from './TransactionFilterTrigger';
import { summarizeSelection } from './transactionFilterSummary';
import { useOptimisticSelection } from './useOptimisticSelection';
import type { SelectionFilterConfig } from './transactionFilterConfig';
import type { SelectionFilterState } from './transactionFilterTypes';

type TransactionMultiSelectFilterProps = {
  filter: SelectionFilterConfig;
  state: SelectionFilterState;
  onChange: (values: string[]) => Promise<void>;
  /** Controlled open state so applied chips can reopen this menu. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Quick multi-select filter — checkbox dropdown, positive match only. */
export const TransactionMultiSelectFilter = ({
  filter,
  state,
  onChange,
  open,
  onOpenChange,
}: TransactionMultiSelectFilterProps) => {
  const { selected, commit, toggle } = useOptimisticSelection(
    state.values,
    onChange
  );
  const selectedSet = new Set(selected);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <TransactionFilterTrigger
            icon={filter.icon}
            label={summarizeSelection(selected, state.labels, filter.allLabel)}
          />
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        {state.groups.map((group, groupIndex) => (
          <Fragment key={group.key}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {group.label ? (
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              ) : null}
              {group.options.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedSet.has(option.value)}
                  // Keep the menu open while toggling multiple values.
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => toggle(option.value)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </Fragment>
        ))}
        {selected.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => commit([])}>
              Clear
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
