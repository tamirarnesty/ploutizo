import { useCallback, useEffect, useRef, useState } from 'react';
import { centsToDollars } from '@ploutizo/utils/currency';
import {
  resolveImportRowReviewAmount,
  resolveImportRowReviewDescription,
} from '@ploutizo/utils/import-row-status';
import type { ImportDraftRow } from '@ploutizo/types';

const useSyncedField = <T>(serverValue: T) => {
  const [value, setValueState] = useState(serverValue);
  const dirtyRef = useRef(false);

  const setValue = useCallback((next: T) => {
    dirtyRef.current = true;
    setValueState(next);
  }, []);

  const markSaved = useCallback(() => {
    dirtyRef.current = false;
  }, []);

  useEffect(() => {
    if (dirtyRef.current) return;
    setValueState((current) =>
      Object.is(current, serverValue) ? current : serverValue
    );
  }, [serverValue]);

  return { value, setValue, markSaved };
};

export const useImportRowDescriptionState = (row: ImportDraftRow) => {
  const serverValue = resolveImportRowReviewDescription(row) ?? '';
  const { value, setValue, markSaved } = useSyncedField(serverValue);
  return {
    description: value,
    setDescription: setValue,
    markSaved: () => markSaved(),
  };
};

export const useImportRowNotesState = (row: ImportDraftRow) => {
  const serverValue = row.reviewNotes ?? '';
  const { value, setValue, markSaved } = useSyncedField(serverValue);
  return {
    notes: value,
    setNotes: setValue,
    markSaved: () => markSaved(),
  };
};

export const useImportRowAmountState = (row: ImportDraftRow) => {
  const effectiveAmount = resolveImportRowReviewAmount(row);
  const serverValue =
    effectiveAmount != null ? centsToDollars(effectiveAmount) : undefined;
  const { value, setValue, markSaved } = useSyncedField(serverValue);
  return {
    amount: value,
    setAmount: setValue,
    markSaved: () => markSaved(),
  };
};
