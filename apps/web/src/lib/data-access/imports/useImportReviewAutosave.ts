import { useCallback, useSyncExternalStore } from 'react';
import { getReviewPersistence } from './reviewPersistence';
import type {
  ReviewPersistenceSnapshot,
  ReviewPersistenceStatus,
} from './reviewPersistence';

const selectStatus = (snapshot: ReviewPersistenceSnapshot) => snapshot.status;
const selectHasUnsavedWork = (snapshot: ReviewPersistenceSnapshot) =>
  snapshot.hasUnsavedWork;

const useReviewPersistenceSlice = <T>(
  draftId: string,
  select: (snapshot: ReviewPersistenceSnapshot) => T
): T => {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      getReviewPersistence(draftId).subscribe(onStoreChange),
    [draftId]
  );

  return useSyncExternalStore(
    subscribe,
    () => select(getReviewPersistence(draftId).getSnapshot()),
    () => select(getReviewPersistence(draftId).getSnapshot())
  );
};

/** Draft-level autosave status for header UI only (ADR 0005). */
export const useImportReviewAutosaveStatus = (
  draftId: string
): ReviewPersistenceStatus => useReviewPersistenceSlice(draftId, selectStatus);

/** Leave-guard input; isolated from row grid re-renders. */
export const useImportReviewAutosaveHasUnsavedWork = (
  draftId: string
): boolean => useReviewPersistenceSlice(draftId, selectHasUnsavedWork);

/** Per-row persist failure for status icons without draft-wide array subscriptions. */
export const useImportReviewAutosaveRowFailed = (
  draftId: string,
  rowId: string
): boolean => {
  const selectRowFailed = useCallback(
    (snapshot: ReviewPersistenceSnapshot) =>
      snapshot.failedFieldKeys.has(rowId),
    [rowId]
  );
  return useReviewPersistenceSlice(draftId, selectRowFailed);
};
