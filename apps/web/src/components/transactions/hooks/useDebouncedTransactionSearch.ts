import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@tanstack/react-pacer';

/** Shared debounce for transaction text search (list filter, refund linker, etc.). */
export const TRANSACTION_SEARCH_DEBOUNCE_MS = 300;

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

/**
 * The input owns its draft; only the settled (debounced) draft commits to the URL.
 * A URL change that is not the echo of the settled draft (clear filters, back/forward)
 * replaces the draft, which also supersedes any pending debounce.
 */
export const useDebouncedTransactionSearch = ({
  urlQuery,
  onCommit,
}: UseDebouncedTransactionSearchOptions) => {
  const [query, setQuery] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  const [settledQuery] = useDebouncedValue(query, {
    wait: TRANSACTION_SEARCH_DEBOUNCE_MS,
  });

  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== settledQuery.trim()) setQuery(urlQuery);
  }

  // Commit only when the debounced value settles; URL echoes must not re-commit.
  useEffect(() => {
    const trimmed = settledQuery.trim();
    if (trimmed !== urlQuery) onCommit(trimmed);
  }, [settledQuery]);

  return { query, setQuery };
};
