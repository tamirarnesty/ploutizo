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

/** Per-row persist failure for status icons without draft-wide array subscriptions. */
export const useImportReviewAutosaveRowFailed = (
  draftId: string,
  rowId: string
): boolean => {
  const selectRowFailed = useCallback(
    (snapshot: ImportReviewAutosaveSnapshot) =>
      snapshot.failedFieldKeys.has(rowId),
    [rowId]
  );
  return useImportReviewAutosaveSlice(draftId, selectRowFailed);
};
