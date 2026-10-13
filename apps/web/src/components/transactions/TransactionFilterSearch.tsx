import { SearchIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ploutizo/ui/components/input-group';

type TransactionFilterSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export const TransactionFilterSearch = ({
  value,
  onChange,
}: TransactionFilterSearchProps) => (
  <InputGroup className="w-full shrink-0 sm:w-64">
    <InputGroupInput
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search transactions…"
      className="text-xs"
      aria-label="Search transactions"
    />
    <InputGroupAddon>
      <SearchIcon aria-hidden="true" />
    </InputGroupAddon>
  </InputGroup>
);
