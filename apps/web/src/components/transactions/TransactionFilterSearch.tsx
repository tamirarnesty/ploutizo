import { SearchIcon } from 'lucide-react';
import { Input } from '@ploutizo/ui/components/input';

type TransactionFilterSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export const TransactionFilterSearch = ({
  value,
  onChange,
}: TransactionFilterSearchProps) => (
  <div className="relative w-full shrink-0 sm:w-64">
    <SearchIcon
      className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
    <Input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search transactions…"
      className="h-7 pl-8 text-xs"
      aria-label="Search transactions"
    />
  </div>
);
