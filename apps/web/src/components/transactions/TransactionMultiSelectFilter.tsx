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
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type TransactionMultiSelectFilterProps = {
  icon: ReactNode;
  /** Option groups rendered in order; a label heads each labelled group. */
  groups: {
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
  // The draft keeps checked state and toggle math optimistic while open.
  const [draftValues, setDraftValues] = useState<string[] | null>(null);
  // Reconcile once the URL catches up (or an external change lands); the
  // draft and committed values are identical at that point, so this is
  // invisible. Keyed on content because `values` identity is unstable.
  const valuesKey = values.join('\u0000');
  useEffect(() => {
    setDraftValues(null);
  }, [valuesKey]);
  const selected = draftValues ?? values;
  const valueSet = useMemo(() => new Set(selected), [selected]);
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

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) setDraftValues(null);
  };

  const handleToggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    setDraftValues(next);
    onChange(next);
  };
  const handleClear = () => {
    setDraftValues([]);
    onChange([]);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
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
        {groups.map((group, index) => (
          <Fragment key={group.label ?? 'options'}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {group.label ? (
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              ) : null}
              {group.options.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={valueSet.has(option.value)}
                  // Keep the menu open while toggling multiple values.
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => handleToggle(option.value)}
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
            <DropdownMenuItem onClick={handleClear}>Clear</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
