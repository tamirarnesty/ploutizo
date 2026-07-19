export type ImportReviewAutosaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface FailedSelectionPersist {
  rowIds: string[];
  selectedForImport: boolean;
}

interface DraftAutosaveState {
  pendingRowIds: Set<string>;
  inFlightCount: number;
  failedRowIds: Set<string>;
  failedFieldKeys: Map<string, string[]>;
  failedSelection: FailedSelectionPersist | null;
  hasSaved: boolean;
}

export interface ImportReviewAutosaveSnapshot {
  status: ImportReviewAutosaveStatus;
  failedRowIds: string[];
  hasUnsavedWork: boolean;
  failedSelection: FailedSelectionPersist | null;
  failedFieldKeys: ReadonlyMap<string, string[]>;
}

const emptySnapshot: ImportReviewAutosaveSnapshot = {
  status: 'idle',
  failedRowIds: [],
  hasUnsavedWork: false,
  failedSelection: null,
  failedFieldKeys: new Map(),
};

const draftStates = new Map<string, DraftAutosaveState>();
const draftSnapshots = new Map<string, ImportReviewAutosaveSnapshot>();
const listeners = new Map<string, Set<() => void>>();

const getOrCreateState = (draftId: string): DraftAutosaveState => {
  const existing = draftStates.get(draftId);
  if (existing) return existing;
  const created: DraftAutosaveState = {
    pendingRowIds: new Set(),
    inFlightCount: 0,
    failedRowIds: new Set(),
    failedFieldKeys: new Map(),
    failedSelection: null,
    hasSaved: false,
  };
  draftStates.set(draftId, created);
  return created;
};

const deriveStatus = (
  state: DraftAutosaveState
): ImportReviewAutosaveStatus => {
  if (state.pendingRowIds.size > 0 || state.inFlightCount > 0) return 'saving';
  if (state.failedRowIds.size > 0 || state.failedSelection) return 'failed';
  if (state.hasSaved) return 'saved';
  return 'idle';
};

const toSnapshot = (
  state: DraftAutosaveState
): ImportReviewAutosaveSnapshot => {
  const status = deriveStatus(state);
  return {
    status,
    failedRowIds: [...state.failedRowIds],
    hasUnsavedWork: status === 'saving' || status === 'failed',
    failedSelection: state.failedSelection,
    failedFieldKeys: state.failedFieldKeys,
  };
};

const cacheSnapshot = (draftId: string, state: DraftAutosaveState) => {
  draftSnapshots.set(draftId, toSnapshot(state));
};

const emit = (draftId: string) => {
  const state = draftStates.get(draftId);
  if (state) cacheSnapshot(draftId, state);
  const draftListeners = listeners.get(draftId);
  if (!draftListeners) return;
  for (const listener of draftListeners) listener();
};

const rowHasSelectionFailure = (state: DraftAutosaveState, rowId: string) =>
  Boolean(state.failedSelection?.rowIds.includes(rowId));

const refreshFailedRowMembership = (
  state: DraftAutosaveState,
  rowId: string
) => {
  if (
    state.failedFieldKeys.has(rowId) ||
    rowHasSelectionFailure(state, rowId)
  ) {
    state.failedRowIds.add(rowId);
    return;
  }
  state.failedRowIds.delete(rowId);
};

export const getImportReviewAutosaveSnapshot = (
  draftId: string
): ImportReviewAutosaveSnapshot => {
  const cached = draftSnapshots.get(draftId);
  if (cached) return cached;
  const state = draftStates.get(draftId);
  if (!state) return emptySnapshot;
  cacheSnapshot(draftId, state);
  return draftSnapshots.get(draftId) ?? emptySnapshot;
};

export const subscribeImportReviewAutosave = (
  draftId: string,
  listener: () => void
) => {
  let draftListeners = listeners.get(draftId);
  if (!draftListeners) {
    draftListeners = new Set();
    listeners.set(draftId, draftListeners);
  }
  draftListeners.add(listener);
  return () => {
    draftListeners.delete(listener);
    if (draftListeners.size === 0) listeners.delete(draftId);
  };
};

export const markImportReviewPending = (draftId: string, rowId: string) => {
  const state = getOrCreateState(draftId);
  state.pendingRowIds.add(rowId);
  emit(draftId);
};

export const markImportReviewPersistStart = (
  draftId: string,
  rowId: string
) => {
  const state = getOrCreateState(draftId);
  state.pendingRowIds.delete(rowId);
  state.inFlightCount += 1;
  emit(draftId);
};

/**
 * Mark a row persist as successful. When `succeededKeys` is provided, only those
 * failed keys clear — so a later edit of other fields cannot hide an earlier Failed field.
 * Omit `succeededKeys` to clear all failed keys for the row (explicit Retry of known failures).
 */
export const markImportReviewPersistSuccess = (
  draftId: string,
  rowId: string,
  succeededKeys?: readonly string[]
) => {
  const state = getOrCreateState(draftId);
  state.inFlightCount = Math.max(0, state.inFlightCount - 1);

  if (succeededKeys === undefined) {
    state.failedFieldKeys.delete(rowId);
  } else {
    const remaining = (state.failedFieldKeys.get(rowId) ?? []).filter(
      (key) => !succeededKeys.includes(key)
    );
    if (remaining.length === 0) {
      state.failedFieldKeys.delete(rowId);
    } else {
      state.failedFieldKeys.set(rowId, remaining);
    }
  }

  refreshFailedRowMembership(state, rowId);
  state.hasSaved = true;
  emit(draftId);
};

export const markImportReviewPersistFailure = (
  draftId: string,
  rowId: string,
  fieldKeys: string[]
) => {
  const state = getOrCreateState(draftId);
  state.inFlightCount = Math.max(0, state.inFlightCount - 1);
  const previous = state.failedFieldKeys.get(rowId) ?? [];
  state.failedFieldKeys.set(rowId, [...new Set([...previous, ...fieldKeys])]);
  state.failedRowIds.add(rowId);
  emit(draftId);
};

export const markImportReviewSelectionStart = (draftId: string) => {
  const state = getOrCreateState(draftId);
  state.inFlightCount += 1;
  emit(draftId);
};

export const markImportReviewSelectionSuccess = (draftId: string) => {
  const state = getOrCreateState(draftId);
  state.inFlightCount = Math.max(0, state.inFlightCount - 1);
  const previous = state.failedSelection;
  state.failedSelection = null;
  if (previous) {
    for (const rowId of previous.rowIds) {
      refreshFailedRowMembership(state, rowId);
    }
  }
  state.hasSaved = true;
  emit(draftId);
};

export const markImportReviewSelectionFailure = (
  draftId: string,
  failure: FailedSelectionPersist
) => {
  const state = getOrCreateState(draftId);
  state.inFlightCount = Math.max(0, state.inFlightCount - 1);
  state.failedSelection = failure;
  for (const rowId of failure.rowIds) {
    state.failedRowIds.add(rowId);
  }
  emit(draftId);
};

export const releaseImportReviewAutosave = (draftId: string) => {
  draftStates.delete(draftId);
  draftSnapshots.delete(draftId);
  listeners.delete(draftId);
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

export const resetImportReviewAutosaveForTests = () => {
  draftStates.clear();
  draftSnapshots.clear();
  listeners.clear();
};
