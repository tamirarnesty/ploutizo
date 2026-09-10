import { useSyncExternalStore } from 'react';
import {
  getImportReviewAutosaveSnapshot,
  subscribeImportReviewAutosave,
} from './importReviewAutosave';
import type { ImportReviewAutosaveStatus } from './importReviewAutosave';

const subscribe = (draftId: string) => (onStoreChange: () => void) =>
  subscribeImportReviewAutosave(draftId, onStoreChange);

/** Draft-level autosave status for header UI only (ADR 0005). */
export const useImportReviewAutosaveStatus = (
  draftId: string
): ImportReviewAutosaveStatus =>
  useSyncExternalStore(
    subscribe(draftId),
    () => getImportReviewAutosaveSnapshot(draftId).status,
    () => getImportReviewAutosaveSnapshot(draftId).status
  );

/** Leave-guard input; isolated from row grid re-renders. */
export const useImportReviewAutosaveHasUnsavedWork = (
  draftId: string
): boolean =>
  useSyncExternalStore(
    subscribe(draftId),
    () => getImportReviewAutosaveSnapshot(draftId).hasUnsavedWork,
    () => getImportReviewAutosaveSnapshot(draftId).hasUnsavedWork
  );

/** Row persist failures for status icons; reference-stable when ids unchanged. */
export const useImportReviewAutosaveFailedRowIds = (
  draftId: string
): readonly string[] =>
  useSyncExternalStore(
    subscribe(draftId),
    () => getImportReviewAutosaveSnapshot(draftId).failedRowIds,
    () => getImportReviewAutosaveSnapshot(draftId).failedRowIds
  );
