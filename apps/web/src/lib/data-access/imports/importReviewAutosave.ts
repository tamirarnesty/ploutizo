import {
  eachImportDraftReviewRuntime,
  getImportDraftReviewRuntime,
} from './importDraftReviewRuntime';
import type { DraftAutosaveState } from './importDraftReviewRuntime';

export type ImportReviewAutosaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface ImportReviewAutosaveSnapshot {
  status: ImportReviewAutosaveStatus;
  failedRowIds: string[];
  hasUnsavedWork: boolean;
  failedFieldKeys: ReadonlyMap<string, string[]>;
}

const emptySnapshot: ImportReviewAutosaveSnapshot = {
  status: 'idle',
  failedRowIds: [],
  hasUnsavedWork: false,
  failedFieldKeys: new Map(),
};

const getOrCreateState = (draftId: string): DraftAutosaveState =>
  getImportDraftReviewRuntime(draftId).autosave;

const deriveStatus = (
  state: DraftAutosaveState
): ImportReviewAutosaveStatus => {
  if (state.pendingRowIds.size > 0 || state.inFlightCount > 0) return 'saving';
  if (state.failedFieldKeys.size > 0) return 'failed';
  if (state.hasSaved) return 'saved';
  return 'idle';
};

const toSnapshot = (
  state: DraftAutosaveState
): ImportReviewAutosaveSnapshot => {
  const status = deriveStatus(state);
  return {
    status,
    failedRowIds: [...state.failedFieldKeys.keys()],
    hasUnsavedWork: status === 'saving' || status === 'failed',
    failedFieldKeys: state.failedFieldKeys,
  };
};

const emit = (draftId: string) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  runtime.autosaveSnapshot = toSnapshot(runtime.autosave);
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
  const state = getOrCreateState(draftId);
  state.pendingRowIds.add(rowId);
  emit(draftId);
};

export const clearImportReviewPendingRows = (
  draftId: string,
  rowIds: readonly string[]
) => {
  const state = getImportDraftReviewRuntime(draftId).autosave;
  if (rowIds.length === 0) return;
  let changed = false;
  for (const rowId of rowIds) {
    if (state.pendingRowIds.delete(rowId)) changed = true;
  }
  if (changed) emit(draftId);
};

const applyPersistStart = (state: DraftAutosaveState, rowId: string) => {
  state.pendingRowIds.delete(rowId);
  state.inFlightCount += 1;
};

/** One snapshot for a whole batch, instead of one notify per row. */
export const markImportReviewPersistStartMany = (
  draftId: string,
  rowIds: readonly string[]
) => {
  if (rowIds.length === 0) return;
  const state = getOrCreateState(draftId);
  for (const rowId of rowIds) applyPersistStart(state, rowId);
  emit(draftId);
};

const applyPersistSuccess = (
  state: DraftAutosaveState,
  rowId: string,
  succeededKeys?: readonly string[]
) => {
  state.inFlightCount = Math.max(0, state.inFlightCount - 1);

  if (succeededKeys === undefined) {
    state.failedFieldKeys.delete(rowId);
    return;
  }

  const remaining = (state.failedFieldKeys.get(rowId) ?? []).filter(
    (key) => !succeededKeys.includes(key)
  );
  if (remaining.length === 0) {
    state.failedFieldKeys.delete(rowId);
    return;
  }
  state.failedFieldKeys.set(rowId, remaining);
};

/**
 * Mark a row persist as successful. When `succeededKeys` is provided, only those
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
  const state = getOrCreateState(draftId);
  for (const entry of entries) {
    applyPersistSuccess(state, entry.rowId, entry.succeededKeys);
  }
  state.hasSaved = true;
  emit(draftId);
};

const applyPersistFailure = (
  state: DraftAutosaveState,
  rowId: string,
  fieldKeys: readonly string[]
) => {
  state.inFlightCount = Math.max(0, state.inFlightCount - 1);
  const previous = state.failedFieldKeys.get(rowId) ?? [];
  state.failedFieldKeys.set(rowId, [...new Set([...previous, ...fieldKeys])]);
};

export const markImportReviewPersistFailureMany = (
  draftId: string,
  entries: readonly { rowId: string; fieldKeys: readonly string[] }[]
) => {
  if (entries.length === 0) return;
  const state = getOrCreateState(draftId);
  for (const entry of entries) {
    applyPersistFailure(state, entry.rowId, entry.fieldKeys);
  }
  emit(draftId);
};

export const releaseImportReviewAutosave = (draftId: string) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  runtime.autosave.pendingRowIds.clear();
  runtime.autosave.inFlightCount = 0;
  runtime.autosave.failedFieldKeys.clear();
  runtime.autosave.hasSaved = false;
  runtime.autosaveSnapshot = undefined;
  runtime.autosaveListeners.clear();
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
    runtime.autosave.pendingRowIds.clear();
    runtime.autosave.inFlightCount = 0;
    runtime.autosave.failedFieldKeys.clear();
    runtime.autosave.hasSaved = false;
    runtime.autosaveSnapshot = undefined;
    runtime.autosaveListeners.clear();
  });
};
