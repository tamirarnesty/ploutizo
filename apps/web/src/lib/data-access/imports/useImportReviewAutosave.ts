import { useCallback, useSyncExternalStore } from 'react';
import {
  getImportReviewAutosaveSnapshot,
  subscribeImportReviewAutosave,
} from './importReviewAutosave';
import type {
  ImportReviewAutosaveSnapshot,
  ImportReviewAutosaveStatus,
} from './importReviewAutosave';

const selectStatus = (snapshot: ImportReviewAutosaveSnapshot) =>
  snapshot.status;
const selectHasUnsavedWork = (snapshot: ImportReviewAutosaveSnapshot) =>
  snapshot.hasUnsavedWork;
const selectFailedRowIds = (snapshot: ImportReviewAutosaveSnapshot) =>
  snapshot.failedRowIds;

const useImportReviewAutosaveSlice = <T>(
  draftId: string,
  select: (snapshot: ImportReviewAutosaveSnapshot) => T
): T => {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      subscribeImportReviewAutosave(draftId, onStoreChange),
    [draftId]
  );

  return useSyncExternalStore(
    subscribe,
    () => select(getImportReviewAutosaveSnapshot(draftId)),
    () => select(getImportReviewAutosaveSnapshot(draftId))
  );
};

/** Draft-level autosave status for header UI only (ADR 0005). */
export const useImportReviewAutosaveStatus = (
  draftId: string
): ImportReviewAutosaveStatus =>
  useImportReviewAutosaveSlice(draftId, selectStatus);

/** Leave-guard input; isolated from row grid re-renders. */
export const useImportReviewAutosaveHasUnsavedWork = (
  draftId: string
): boolean => useImportReviewAutosaveSlice(draftId, selectHasUnsavedWork);

/** Row persist failures for status icons; reference-stable when ids unchanged. */
export const useImportReviewAutosaveFailedRowIds = (
  draftId: string
): readonly string[] =>
  useImportReviewAutosaveSlice(draftId, selectFailedRowIds);
