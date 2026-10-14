import { useEffect, useRef, useState } from 'react';
import { useDebouncer } from '@tanstack/react-pacer';
import { TRANSACTION_SEARCH_DEBOUNCE_MS } from '../transactionSearch';

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

/**
 * The field owns what the user is typing; the URL owns the committed query.
 * When the URL changes without matching our last commit, drop the draft and
 * cancel any pending debounced commit. Commit echoes keep the draft so trailing
 * spaces and in-progress keystrokes survive replace navigation.
 */
export const useDebouncedTransactionSearch = ({
  urlQuery,
  onCommit,
}: UseDebouncedTransactionSearchOptions) => {
  const [draft, setDraft] = useState<string | null>(null);
  const urlQueryRef = useRef(urlQuery);
  const lastCommitRef = useRef(urlQuery);

  urlQueryRef.current = urlQuery;

  const { maybeExecute: commitDebounced, cancel } = useDebouncer(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === urlQueryRef.current) return;
      lastCommitRef.current = trimmed;
      onCommit(trimmed);
    },
    { wait: TRANSACTION_SEARCH_DEBOUNCE_MS }
  );

  useEffect(() => {
    if (urlQuery === lastCommitRef.current) return;
    lastCommitRef.current = urlQuery;
    cancel();
    setDraft(null);
  }, [urlQuery, cancel]);

  const setQuery = (value: string) => {
    setDraft(value);
    commitDebounced(value);
  };

  return { query: draft ?? urlQuery, setQuery };
};
