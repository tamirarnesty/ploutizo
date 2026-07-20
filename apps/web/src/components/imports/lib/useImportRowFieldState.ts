import { useCallback, useEffect, useRef, useState } from 'react';
import { centsToDollars } from '@ploutizo/utils/currency';
import type { ImportDraftRow } from '@ploutizo/types';

type ImportRowFieldKey = 'description' | 'notes' | 'amount';

const serverDescription = (row: ImportDraftRow) => row.reviewDescription ?? '';
const serverNotes = (row: ImportDraftRow) => row.reviewNotes ?? '';
const serverAmount = (row: ImportDraftRow): number | undefined =>
  row.reviewAmount != null ? centsToDollars(row.reviewAmount) : undefined;

export const useImportRowFieldState = (row: ImportDraftRow) => {
  const [description, setDescriptionState] = useState(() =>
    serverDescription(row)
  );
  const [notes, setNotesState] = useState(() => serverNotes(row));
  const [amount, setAmountState] = useState<number | undefined>(() =>
    serverAmount(row)
  );

  const dirtyRef = useRef<Record<ImportRowFieldKey, boolean>>({
    description: false,
    notes: false,
    amount: false,
  });

  const setDescription = useCallback((value: string) => {
    dirtyRef.current.description = true;
    setDescriptionState(value);
  }, []);

  const setNotes = useCallback((value: string) => {
    dirtyRef.current.notes = true;
    setNotesState(value);
  }, []);

  const setAmount = useCallback((value: number | undefined) => {
    dirtyRef.current.amount = true;
    setAmountState(value);
  }, []);

  const markSaved = useCallback((field: ImportRowFieldKey) => {
    dirtyRef.current[field] = false;
  }, []);

  useEffect(() => {
    if (!dirtyRef.current.description) {
      const next = serverDescription(row);
      setDescriptionState((current) => (current === next ? current : next));
    }
    if (!dirtyRef.current.notes) {
      const next = serverNotes(row);
      setNotesState((current) => (current === next ? current : next));
    }
    if (!dirtyRef.current.amount) {
      const next = serverAmount(row);
      setAmountState((current) => (current === next ? current : next));
    }
  }, [row.id, row.reviewDescription, row.reviewNotes, row.reviewAmount]);

  return {
    description,
    notes,
    amount,
    setDescription,
    setNotes,
    setAmount,
    markSaved,
  };
};
