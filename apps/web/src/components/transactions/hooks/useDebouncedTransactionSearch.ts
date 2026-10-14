import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncer } from '@tanstack/react-pacer';
import { TRANSACTION_SEARCH_DEBOUNCE_MS } from '../transactionSearch';

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

/**
 * The field owns what the user is typing. The URL owns the committed query.
 * A URL change replaces the draft unless it is the echo of the query this hook
 * just committed, so typing that continued during navigation is kept.
 */
export const useDebouncedTransactionSearch = ({
  urlQuery,
  onCommit,
}: UseDebouncedTransactionSearchOptions) => {
  const [draft, setDraft] = useState<string | null>(null);
  const committedRef = useRef<string | null>(null);

  const { maybeExecute: commitDebounced, cancel } = useDebouncer(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === urlQuery) return;
      committedRef.current = trimmed;
      onCommit(trimmed);
    },
    { wait: TRANSACTION_SEARCH_DEBOUNCE_MS }
  );

  useEffect(() => {
    if (urlQuery === committedRef.current) {
      committedRef.current = null;
      return;
    }
    cancel();
    setDraft(null);
  }, [urlQuery, cancel]);

  const setQuery = (value: string) => {
    setDraft(value);
    commitDebounced(value);
  };

  const resetDraft = useCallback(() => {
    cancel();
    committedRef.current = null;
    setDraft(null);
  }, [cancel]);

  return { query: draft ?? urlQuery, setQuery, resetDraft };
};
