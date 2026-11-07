/**
 * Review persistence: pure per-row state machine for saving reviewed import
 * values. Draft-level status is derived from row state, never stored.
 */

export type ReviewPersistenceStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type ReviewPersistenceRowPhase =
  'clean' | 'pending' | 'in_flight' | 'failed';

/**
 * A row can be edited again while an older save is in flight, and an earlier
 * failed field outlives later edits, so the row tracks all three facts and its
 * phase is derived: pending > in_flight > failed > clean.
 */
export interface ReviewPersistenceRow {
  pending: boolean;
  inFlight: number;
  failedKeys: readonly string[];
}

export interface ReviewPersistenceState {
  /** Only non-clean rows are present. */
  rows: ReadonlyMap<string, ReviewPersistenceRow>;
  hasSaved: boolean;
}

export type ReviewPersistenceEvent =
  | { type: 'edited'; rowId: string }
  | { type: 'edits_dropped'; rowIds: readonly string[] }
  | { type: 'persist_started'; rowIds: readonly string[] }
  | {
      type: 'persist_succeeded';
      /** Omit `succeededKeys` to clear every failed key of the row (Retry). */
      entries: readonly { rowId: string; succeededKeys?: readonly string[] }[];
    }
  | {
      type: 'persist_failed';
      entries: readonly { rowId: string; fieldKeys: readonly string[] }[];
    };

export interface ReviewPersistenceSnapshot {
  status: ReviewPersistenceStatus;
  failedRowIds: string[];
  hasUnsavedWork: boolean;
  failedFieldKeys: ReadonlyMap<string, string[]>;
}

export const initialReviewPersistenceState: ReviewPersistenceState = {
  rows: new Map(),
  hasSaved: false,
};

const cleanRow: ReviewPersistenceRow = {
  pending: false,
  inFlight: 0,
  failedKeys: [],
};

export const getReviewPersistenceRowPhase = (
  row: ReviewPersistenceRow
): ReviewPersistenceRowPhase => {
  if (row.pending) return 'pending';
  if (row.inFlight > 0) return 'in_flight';
  if (row.failedKeys.length > 0) return 'failed';
  return 'clean';
};

const isClean = (row: ReviewPersistenceRow) =>
  getReviewPersistenceRowPhase(row) === 'clean';

/** Returns the same `state` when no row changed. */
const updateRows = <T>(
  state: ReviewPersistenceState,
  items: readonly T[],
  rowIdOf: (item: T) => string,
  update: (row: ReviewPersistenceRow, item: T) => ReviewPersistenceRow,
  hasSaved = state.hasSaved
): ReviewPersistenceState => {
  const rows = new Map(state.rows);
  let changed = hasSaved !== state.hasSaved;
  for (const item of items) {
    const rowId = rowIdOf(item);
    const previous = rows.get(rowId) ?? cleanRow;
    const next = update(previous, item);
    if (next === previous) continue;
    changed = true;
    if (isClean(next)) rows.delete(rowId);
    else rows.set(rowId, next);
  }
  return changed ? { rows, hasSaved } : state;
};

const finishOneInFlight = (row: ReviewPersistenceRow) =>
  Math.max(0, row.inFlight - 1);

const withoutKeys = (
  keys: readonly string[],
  cleared: readonly string[] | undefined
) => {
  if (cleared === undefined) return [];
  const clearedSet = new Set(cleared);
  return keys.filter((key) => !clearedSet.has(key));
};

export const reduceReviewPersistence = (
  state: ReviewPersistenceState,
  event: ReviewPersistenceEvent
): ReviewPersistenceState => {
  switch (event.type) {
    case 'edited':
      return updateRows(
        state,
        [event.rowId],
        (rowId) => rowId,
        (row) => (row.pending ? row : { ...row, pending: true })
      );
    case 'edits_dropped':
      return updateRows(
        state,
        event.rowIds,
        (rowId) => rowId,
        (row) => (row.pending ? { ...row, pending: false } : row)
      );
    case 'persist_started':
      return updateRows(
        state,
        event.rowIds,
        (rowId) => rowId,
        (row) => ({ ...row, pending: false, inFlight: row.inFlight + 1 })
      );
    case 'persist_succeeded':
      return updateRows(
        state,
        event.entries,
        (entry) => entry.rowId,
        (row, entry) => ({
          ...row,
          inFlight: finishOneInFlight(row),
          failedKeys: withoutKeys(row.failedKeys, entry.succeededKeys),
        }),
        true
      );
    case 'persist_failed':
      return updateRows(
        state,
        event.entries,
        (entry) => entry.rowId,
        (row, entry) => ({
          ...row,
          inFlight: finishOneInFlight(row),
          failedKeys: [...new Set([...row.failedKeys, ...entry.fieldKeys])],
        })
      );
  }
};

export const deriveReviewPersistence = (
  state: ReviewPersistenceState
): ReviewPersistenceSnapshot => {
  let saving = false;
  const failedFieldKeys = new Map<string, string[]>();
  for (const [rowId, row] of state.rows) {
    const phase = getReviewPersistenceRowPhase(row);
    if (phase === 'pending' || phase === 'in_flight') saving = true;
    if (row.failedKeys.length > 0) {
      failedFieldKeys.set(rowId, [...row.failedKeys]);
    }
  }

  let status: ReviewPersistenceStatus = 'idle';
  if (saving) status = 'saving';
  else if (failedFieldKeys.size > 0) status = 'failed';
  else if (state.hasSaved) status = 'saved';

  return {
    status,
    failedRowIds: [...failedFieldKeys.keys()],
    hasUnsavedWork: status === 'saving' || status === 'failed',
    failedFieldKeys,
  };
};
