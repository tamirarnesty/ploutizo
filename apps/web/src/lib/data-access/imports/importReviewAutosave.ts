import {
  eachImportDraftReviewRuntime,
  getImportDraftReviewRuntime,
} from './importDraftReviewRuntime';
import {
  deriveReviewPersistence,
  initialReviewPersistenceState,
  reduceReviewPersistence,
} from './reviewPersistenceReducer';
import type {
  ReviewPersistenceEvent,
  ReviewPersistenceSnapshot,
  ReviewPersistenceStatus,
} from './reviewPersistenceReducer';

export type ImportReviewAutosaveStatus = ReviewPersistenceStatus;
export type ImportReviewAutosaveSnapshot = ReviewPersistenceSnapshot;

const emptySnapshot: ImportReviewAutosaveSnapshot = {
  status: 'idle',
  failedRowIds: [],
  hasUnsavedWork: false,
  failedFieldKeys: new Map(),
};

const dispatch = (draftId: string, event: ReviewPersistenceEvent) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  const next = reduceReviewPersistence(runtime.autosave, event);
  if (next === runtime.autosave) return;
  runtime.autosave = next;
  runtime.autosaveSnapshot = deriveReviewPersistence(next);
  for (const listener of runtime.autosaveListeners) listener();
};

export const getImportReviewAutosaveSnapshot = (
  draftId: string
): ImportReviewAutosaveSnapshot =>
  getImportDraftReviewRuntime(draftId).autosaveSnapshot ?? emptySnapshot;

/** Fires when draft autosave status newly becomes `failed`. */
export const subscribeImportReviewAutosaveFailure = (
  draftId: string,
  listener: () => void
) => {
  let lastStatus = getImportReviewAutosaveSnapshot(draftId).status;
  const onChange = () => {
    const snapshot = getImportReviewAutosaveSnapshot(draftId);
    if (snapshot.status === 'failed' && lastStatus !== 'failed') {
      listener();
    }
    lastStatus = snapshot.status;
  };
  return subscribeImportReviewAutosave(draftId, onChange);
};

export const subscribeImportReviewAutosave = (
  draftId: string,
  listener: () => void
) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  runtime.autosaveListeners.add(listener);
  return () => {
    runtime.autosaveListeners.delete(listener);
  };
};

export const markImportReviewPending = (draftId: string, rowId: string) => {
  dispatch(draftId, { type: 'edited', rowId });
};

export const clearImportReviewPendingRows = (
  draftId: string,
  rowIds: readonly string[]
) => {
  if (rowIds.length === 0) return;
  dispatch(draftId, { type: 'edits_dropped', rowIds });
};

/** One snapshot for a whole batch, instead of one notify per row. */
export const markImportReviewPersistStartMany = (
  draftId: string,
  rowIds: readonly string[]
) => {
  if (rowIds.length === 0) return;
  dispatch(draftId, { type: 'persist_started', rowIds });
};

/**
 * Mark row persists as successful. When `succeededKeys` is provided, only those
 * failed keys clear — so a later edit of other fields cannot hide an earlier Failed field.
 * Omit `succeededKeys` to clear all failed keys for the row (explicit Retry of known failures).
 */
export const markImportReviewPersistSuccessMany = (
  draftId: string,
  entries: readonly {
    rowId: string;
    succeededKeys?: readonly string[];
  }[]
) => {
  if (entries.length === 0) return;
  dispatch(draftId, { type: 'persist_succeeded', entries });
};

export const markImportReviewPersistFailureMany = (
  draftId: string,
  entries: readonly { rowId: string; fieldKeys: readonly string[] }[]
) => {
  if (entries.length === 0) return;
  dispatch(draftId, { type: 'persist_failed', entries });
};

/** Resolve once the draft is not in the Saving state (pending/in-flight cleared). */
export const waitForImportReviewAutosaveSettled = (draftId: string) =>
  new Promise<void>((resolve) => {
    const check = () => {
      const snapshot = getImportReviewAutosaveSnapshot(draftId);
      if (snapshot.status !== 'saving') {
        unsubscribe();
        resolve();
      }
    };
    const unsubscribe = subscribeImportReviewAutosave(draftId, check);
    check();
  });

export const endImportReviewAutosave = () => {
  eachImportDraftReviewRuntime((runtime) => {
    runtime.autosave = initialReviewPersistenceState;
    runtime.autosaveSnapshot = undefined;
    runtime.autosaveListeners.clear();
  });
};
