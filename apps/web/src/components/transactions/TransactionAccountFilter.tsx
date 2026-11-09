import { useState } from 'react';
import { ChevronDownIcon, WalletIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import { FilterOptionList } from '@ploutizo/ui/components/reui/filter-option-list';
import type { FilterOption } from '@ploutizo/ui/components/reui/filters-types';

type Account = { id: string; name: string };

type TransactionAccountFilterProps = {
  accounts: Account[];
  /** Active account filter value; undefined = all accounts. */
  accountId?: string;
  /** Non-default operator means the panel owns this filter — show a neutral label. */
  operator?: string;
  onSelect: (accountId: string | undefined) => void;
};

/** Quick account filter — single-select, positive match only. */
export const TransactionAccountFilter = ({
  accounts,
  accountId,
  operator,
  onSelect,
}: TransactionAccountFilterProps) => {
  const [open, setOpen] = useState(false);
  const isCustom = Boolean(operator && operator !== 'is');
  const selected = accounts.find((account) => account.id === accountId);
  const label = isCustom ? 'Custom' : (selected?.name ?? 'All accounts');

  const options: FilterOption<string>[] = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

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
            <WalletIcon className="size-3.5" />
            <span className="truncate">{label}</span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-56 p-1.5">
        <FilterOptionList
          options={options}
          values={accountId ? [accountId] : []}
          clearLabel="All accounts"
          onClear={() => {
            onSelect(undefined);
            setOpen(false);
          }}
          onToggle={(value) => {
            onSelect(accountId === value ? undefined : value);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
