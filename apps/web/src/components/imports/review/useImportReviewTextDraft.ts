import { useCallback, useEffect, useRef, useState } from 'react';

const normalizeImportText = (raw: string) => raw.trim() || null;

/**
 * Focus chrome for review text fields. Writes the working copy on change;
 * paced mutations own the only persist debounce (ADR 0005).
 */
export const useImportReviewTextDraft = (
  savedValue: string | null,
  save: (next: string | null) => void,
  resetKey: string
) => {
  const [draft, setDraft] = useState(() => savedValue ?? '');
  const draftRef = useRef(draft);
  const focusedRef = useRef(false);

  draftRef.current = draft;

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(savedValue ?? '');
    }
  }, [resetKey, savedValue]);

  const commit = useCallback(() => {
    const next = normalizeImportText(draftRef.current);
    if (next === savedValue) return;
    save(next);
  }, [save, savedValue]);

  return {
    draft,
    onChange: (raw: string) => {
      setDraft(raw);
      const next = normalizeImportText(raw);
      if (next === savedValue) return;
      save(next);
    },
    onFocus: () => {
      focusedRef.current = true;
    },
    onBlur: () => {
      focusedRef.current = false;
      commit();
      setDraft(normalizeImportText(draftRef.current) ?? '');
    },
  };
};
