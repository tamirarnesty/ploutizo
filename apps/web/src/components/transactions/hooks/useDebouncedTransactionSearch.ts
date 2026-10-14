import { useState } from 'react';
import { useDebouncer } from '@tanstack/react-pacer';
import { TRANSACTION_SEARCH_DEBOUNCE_MS } from '../transactionSearch';

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

/**
 * The field owns what the user is typing. The URL owns the committed query.
 * The draft is never reset here: the caller remounts the field (via `key`)
 * when the user navigates, which drops the draft and any pending commit.
 */
export const useDebouncedTransactionSearch = ({
  urlQuery,
  onCommit,
}: UseDebouncedTransactionSearchOptions) => {
  const [draft, setDraft] = useState<string | null>(null);

  const { maybeExecute: commitDebounced } = useDebouncer(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed !== urlQuery) onCommit(trimmed);
    },
    { wait: TRANSACTION_SEARCH_DEBOUNCE_MS }
  );

  const setQuery = (value: string) => {
    setDraft(value);
    commitDebounced(value);
  };

  return { query: draft ?? urlQuery, setQuery };
};
