import { SearchIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ploutizo/ui/components/input-group';
import { useDebouncedTransactionSearch } from './hooks/useDebouncedTransactionSearch';

type TransactionFilterSearchProps = {
  /** Committed query from the URL. Remount (via `key`) on navigation to reset the draft. */
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
    <InputGroup className="w-full shrink-0 sm:w-64">
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
