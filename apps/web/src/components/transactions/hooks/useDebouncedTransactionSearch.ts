import { useState } from 'react';
import { useDebouncer } from '@tanstack/react-pacer';

/** Shared debounce for transaction text search (list filter, refund linker, etc.). */
export const TRANSACTION_SEARCH_DEBOUNCE_MS = 300;

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

/**
 * The input owns its draft; typing schedules a debounced commit to the URL.
 * A URL change that is not the echo of our last commit (clear filters,
 * back/forward) replaces the draft, and a pending commit for the replaced
 * draft no longer matches the current query, so it is skipped.
 */
export const useDebouncedTransactionSearch = ({
  urlQuery,
  onCommit,
}: UseDebouncedTransactionSearchOptions) => {
  const [query, setDraft] = useState(urlQuery);
  const [committedQuery, setCommittedQuery] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);

  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== committedQuery) {
      setDraft(urlQuery);
      setCommittedQuery(urlQuery);
    }
  }

  // useDebouncer swaps in this render's callback, so it reads the current draft.
  const { maybeExecute: commitDebounced } = useDebouncer(
    (value: string) => {
      if (value !== query) return;
      const trimmed = value.trim();
      if (trimmed === urlQuery) return;
      setCommittedQuery(trimmed);
      onCommit(trimmed);
    },
    { wait: TRANSACTION_SEARCH_DEBOUNCE_MS }
  );

  const setQuery = (value: string) => {
    setDraft(value);
    commitDebounced(value);
  };

  return { query, setQuery };
};
