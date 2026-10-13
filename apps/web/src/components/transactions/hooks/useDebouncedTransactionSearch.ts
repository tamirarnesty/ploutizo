import { useCallback, useEffect, useRef, useState } from 'react';

export const TRANSACTION_SEARCH_COMMIT_DELAY_MS = 300;

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

/**
 * The field owns what the user is typing. The URL owns the committed query.
 * They differ during the debounce window. A URL change replaces the draft
 * only when it is not the echo of the query this hook just wrote.
 */
export const useDebouncedTransactionSearch = ({
  urlQuery,
  onCommit,
}: UseDebouncedTransactionSearchOptions) => {
  const [draft, setDraft] = useState(urlQuery);
  const pendingUrlUpdateRef = useRef<string | null>(null);
  const urlQueryRef = useRef(urlQuery);
  const onCommitRef = useRef(onCommit);
  const commitGenerationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  urlQueryRef.current = urlQuery;
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (urlQuery === pendingUrlUpdateRef.current) {
      pendingUrlUpdateRef.current = null;
      return;
    }

    commitGenerationRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setDraft(urlQuery);
  }, [urlQuery]);

  const setQuery = useCallback((value: string) => {
    const generation = ++commitGenerationRef.current;
    setDraft(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (commitGenerationRef.current !== generation) return;
      const trimmed = value.trim();
      if (trimmed === urlQueryRef.current) return;
      pendingUrlUpdateRef.current = trimmed;
      onCommitRef.current(trimmed);
    }, TRANSACTION_SEARCH_COMMIT_DELAY_MS);
  }, []);

  const resetDraft = useCallback(() => {
    commitGenerationRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingUrlUpdateRef.current = null;
    setDraft('');
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { query: draft, setQuery, resetDraft };
};
