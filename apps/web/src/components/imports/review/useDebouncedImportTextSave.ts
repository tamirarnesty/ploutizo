import { useCallback, useEffect, useRef, useState } from 'react';
import { IMPORT_ROW_PACE_WAIT_MS } from '@/lib/data-access/imports/getImportDraftRowPacedMutations';
import { useRegisterInputFlush } from '@/lib/money/pending-input-flush';

const normalizeImportText = (raw: string) => raw.trim() || null;

export const useDebouncedImportTextSave = (
  savedValue: string | null,
  save: (next: string | null) => void,
  options?: { debounceMs?: number; resetKey?: string }
) => {
  const debounceMs = options?.debounceMs ?? IMPORT_ROW_PACE_WAIT_MS;
  const [draft, setDraft] = useState(() => savedValue ?? '');
  const draftRef = useRef(draft);
  const focusedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  draftRef.current = draft;

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(savedValue ?? '');
    }
  }, [options?.resetKey, savedValue]);

  const commit = useCallback(() => {
    const next = normalizeImportText(draftRef.current);
    if (next === savedValue) return;
    save(next);
  }, [save, savedValue]);

  const clearScheduledCommit = useCallback(() => {
    if (!debounceRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = null;
  }, []);

  const scheduleCommit = useCallback(() => {
    clearScheduledCommit();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      commit();
    }, debounceMs);
  }, [clearScheduledCommit, commit, debounceMs]);

  const flushPending = useCallback(() => {
    clearScheduledCommit();
    commit();
  }, [clearScheduledCommit, commit]);

  useRegisterInputFlush(flushPending);

  useEffect(() => () => clearScheduledCommit(), [clearScheduledCommit]);

  return {
    draft,
    onChange: (raw: string) => {
      setDraft(raw);
      scheduleCommit();
    },
    onFocus: () => {
      focusedRef.current = true;
    },
    onBlur: () => {
      focusedRef.current = false;
      flushPending();
    },
  };
};
