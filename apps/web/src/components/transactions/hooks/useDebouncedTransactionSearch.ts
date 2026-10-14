import { useEffect, useRef, useState } from 'react';
import { useDebouncer } from '@tanstack/react-pacer';
import { TRANSACTION_SEARCH_DEBOUNCE_MS } from '../transactionSearch';

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

/**
 * The field owns what the user is typing. The URL owns the committed query.
 * A URL query this field did not write drops the draft and any pending commit.
 * The echo of a commit this field did write keeps the draft, so trailing
 * spaces and in-progress keystrokes survive the replace navigation.
 */
export const useDebouncedTransactionSearch = ({
  urlQuery,
  onCommit,
}: UseDebouncedTransactionSearchOptions) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  const committedRef = useRef(urlQuery);

  const { maybeExecute: commitDebounced, cancel } = useDebouncer(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === urlQuery) return;
      committedRef.current = trimmed;
      onCommit(trimmed);
    },
    { wait: TRANSACTION_SEARCH_DEBOUNCE_MS }
  );

  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== committedRef.current) setDraft(null);
  }

  useEffect(() => {
    if (urlQuery === committedRef.current) return;
    committedRef.current = urlQuery;
    cancel();
  }, [urlQuery, cancel]);

  const setQuery = (value: string) => {
    setDraft(value);
    commitDebounced(value);
  };

  return { query: draft ?? urlQuery, setQuery };
};
