import { useState } from 'react';
import { CalendarDaysIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import { TransactionDateEditor } from './TransactionDateEditor';
import {
  dateFilterFromSearch,
  formatTransactionDateFilterLabel,
} from './transactionDateFilter';
import type { TransactionSearch } from './transactionSearch';

type TransactionDateFilterControlProps = {
  search: TransactionSearch;
  onChange: (next: { operator: string; values: string[] }) => void;
};

/** Quick date filter — presets + full operator set in one popover. */
export const TransactionDateFilterControl = ({
  search,
  onChange,
}: TransactionDateFilterControlProps) => {
  const [open, setOpen] = useState(false);
  const state = dateFilterFromSearch(search);
  const label = formatTransactionDateFilterLabel(state.operator, state.values);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-44 gap-1.5 text-xs"
          >
            <CalendarDaysIcon className="size-3.5" />
            <span className="truncate">{label}</span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-3">
        <TransactionDateEditor
          operator={state.operator}
          values={state.values}
          onChange={onChange}
          onCommit={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
