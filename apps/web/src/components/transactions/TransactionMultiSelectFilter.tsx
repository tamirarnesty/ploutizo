import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
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
import { Fragment, useMemo } from 'react';
import { useOptimisticSelection } from './useOptimisticSelection';
import type { ReactNode } from 'react';

type TransactionMultiSelectFilterProps = {
  icon: ReactNode;
  /** Option groups rendered in order; a label heads each labelled group. */
  groups: {
    key?: string;
    label?: string;
    options: { value: string; label: string; icon?: ReactNode }[];
  }[];
  /** Selected option values; empty = the "all" state. */
  values: string[];
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
  groups,
  values,
  allLabel,
  onChange,
  open,
  onOpenChange,
}: TransactionMultiSelectFilterProps) => {
  // `values` round-trips through the URL, so it lags behind rapid toggles.
  // The optimistic draft keeps checked state and toggle math stable while open.
  const { selected, selectedSet, commit, toggle } = useOptimisticSelection(
    values,
    onChange
  );
  const labelByValue = useMemo(
    () =>
      new Map(
        groups.flatMap((group) =>
          group.options.map((option) => [option.value, option.label])
        )
      ),
    [groups]
  );
  const label =
    selected.length === 0
      ? allLabel
      : selected.map((value) => labelByValue.get(value) ?? value).join(', ');

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
        {groups.map((group, groupIndex) => (
          <Fragment key={group.key ?? group.label ?? 'options'}>
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
