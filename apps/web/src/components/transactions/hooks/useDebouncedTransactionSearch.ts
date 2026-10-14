import { useState } from 'react';
import { useDebouncer } from '@tanstack/react-pacer';
import { TRANSACTION_SEARCH_DEBOUNCE_MS } from '../transactionSearch';

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

/**
 * The input owns its draft; typing schedules a debounced commit to the URL.
 * A URL change matching one of our in-flight commits is an echo and keeps the
 * draft. Any other URL change (clear filters, back/forward) replaces the draft,
 * and a pending commit for the replaced draft no longer matches, so it is skipped.
 */
export const useDebouncedTransactionSearch = ({
  urlQuery,
  onCommit,
}: UseDebouncedTransactionSearchOptions) => {
  const [query, setDraft] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  // Commits sent but not yet echoed by the URL, oldest first.
  const [inFlight, setInFlight] = useState<string[]>([]);

  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    const echoIndex = inFlight.indexOf(urlQuery);
    if (echoIndex === -1) {
      setDraft(urlQuery);
      setInFlight([]);
    } else {
      setInFlight(inFlight.slice(echoIndex + 1));
    }
  }

  const latestCommitted = inFlight.at(-1) ?? seenUrlQuery;

  // useDebouncer swaps in this render's callback, so it reads the current draft.
  const { maybeExecute: commitDebounced } = useDebouncer(
    (value: string) => {
      if (value !== query) return;
      const trimmed = value.trim();
      if (trimmed === latestCommitted) return;
      setInFlight((prev) => [...prev, trimmed]);
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
