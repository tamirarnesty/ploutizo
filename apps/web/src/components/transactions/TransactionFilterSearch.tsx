import { SearchIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ploutizo/ui/components/input-group';
import { useDebouncedTransactionSearch } from './hooks/useDebouncedTransactionSearch';

type TransactionFilterSearchProps = {
  /** Committed query from the URL. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

export const TransactionFilterSearch = ({
  urlQuery,
  onCommit,
}: TransactionFilterSearchProps) => {
  const { query, setQuery } = useDebouncedTransactionSearch({
    urlQuery,
    onCommit,
  });

  return (
    <InputGroup className="min-w-0 flex-1 sm:w-64 sm:flex-none">
      <InputGroupInput
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search transactions…"
        className="text-xs"
        aria-label="Search transactions"
      />
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
    </InputGroup>
  );
};
