import { useCallback, useEffect, useRef, useState } from 'react';

export const TRANSACTION_SEARCH_COMMIT_DELAY_MS = 300;

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

type Draft = {
  value: string;
  sourceUrl: string;
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
  const [draft, setDraft] = useState<Draft | null>(null);
  const pendingUrlUpdateRef = useRef<string | null>(null);
  const commitGenerationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [urlQuery]);

  const setQuery = useCallback(
    (value: string) => {
      const generation = ++commitGenerationRef.current;
      setDraft({ value, sourceUrl: urlQuery });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (commitGenerationRef.current !== generation) return;
        const trimmed = value.trim();
        if (trimmed === urlQuery) return;
        pendingUrlUpdateRef.current = trimmed;
        onCommit(trimmed);
      }, TRANSACTION_SEARCH_COMMIT_DELAY_MS);
    },
    [onCommit, urlQuery]
  );

  const resetDraft = useCallback(() => {
    commitGenerationRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingUrlUpdateRef.current = null;
    setDraft(null);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const query =
    draft &&
    (draft.sourceUrl === urlQuery || pendingUrlUpdateRef.current === urlQuery)
      ? draft.value
      : urlQuery;

  return { query, setQuery, resetDraft };
};
