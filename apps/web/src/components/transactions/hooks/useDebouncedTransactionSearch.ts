import { useEffect, useRef, useState } from 'react';
import { useDebouncer } from '@tanstack/react-pacer';

/** Shared debounce for transaction text search (list filter, refund linker, etc.). */
export const TRANSACTION_SEARCH_DEBOUNCE_MS = 300;

type UseDebouncedTransactionSearchOptions = {
  /** Committed query from the URL. Empty string when the param is absent. */
  urlQuery: string;
  onCommit: (trimmed: string) => void;
};

type SearchDraftState = { kind: 'idle' } | { kind: 'editing'; value: string };

const resolveDisplayedSearchQuery = ({
  urlQuery,
  draft,
  lastCommit,
  urlAtLastCommit,
}: {
  urlQuery: string;
  draft: SearchDraftState;
  lastCommit: string;
  urlAtLastCommit: string;
}): string => {
  if (draft.kind === 'idle') {
    return urlQuery;
  }
  const draftStillRelevant =
    urlQuery === lastCommit ||
    (urlQuery === urlAtLastCommit && lastCommit !== urlQuery);
  return draftStillRelevant ? draft.value : urlQuery;
};

/**
 * Draft typing vs URL commit. Keeps draft through commit echoes (trailing spaces,
 * typing ahead of navigation) and drops it when the URL changes for other reasons.
 * `urlAtLastCommit` covers the gap before replace navigation updates `urlQuery`.
 */
export const useDebouncedTransactionSearch = ({
  urlQuery,
  onCommit,
}: UseDebouncedTransactionSearchOptions) => {
  const [draft, setDraft] = useState<SearchDraftState>({ kind: 'idle' });
  const urlQueryRef = useRef(urlQuery);
  const lastCommitRef = useRef(urlQuery);
  const urlAtLastCommitRef = useRef(urlQuery);

  const { maybeExecute: commitDebounced, cancel } = useDebouncer(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === urlQueryRef.current) return;
      lastCommitRef.current = trimmed;
      urlAtLastCommitRef.current = urlQueryRef.current;
      onCommit(trimmed);
    },
    { wait: TRANSACTION_SEARCH_DEBOUNCE_MS }
  );

  useEffect(() => {
    urlQueryRef.current = urlQuery;
    if (urlQuery === lastCommitRef.current) return;
    lastCommitRef.current = urlQuery;
    urlAtLastCommitRef.current = urlQuery;
    cancel();
  }, [urlQuery, cancel]);

  const setQuery = (value: string) => {
    setDraft({ kind: 'editing', value });
    commitDebounced(value);
  };

  const query = resolveDisplayedSearchQuery({
    urlQuery,
    draft,
    lastCommit: lastCommitRef.current,
    urlAtLastCommit: urlAtLastCommitRef.current,
  });

  return { query, setQuery };
};
