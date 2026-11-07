import { createTransaction } from '@tanstack/db';
import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { beginWorkingSetScope } from '@/lib/access/working-set-registry';
import type { WorkingSetScope } from '@/lib/access/working-set-registry';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { sanitizeImportMatchPatch } from './importMatchTargetOnAccount';
import {
  applyOptimisticRowPatch,
  toValidatorPatch,
} from './importDraftRowOptimisticPatch';
import { buildImportDraftRowPersistPatch } from './buildImportDraftPersistPatch';
import { seedPersistBaseline } from './importDraftPersistBaselines';
import { persistImportDraftBatch } from './persistImportDraftBatch';
import {
  deriveReviewPersistence,
  initialReviewPersistenceState,
  reduceReviewPersistence,
} from './reviewPersistenceReducer';
import type { PersistBaselines } from './importDraftPersistBaselines';
import type { PendingMutation, Transaction } from '@tanstack/db';
import type {
  ReviewPersistenceEvent,
  ReviewPersistenceSnapshot,
  ReviewPersistenceState,
} from './reviewPersistenceReducer';

export const REVIEW_PERSISTENCE_PACE_WAIT_MS = 3000;

export type {
  ReviewPersistenceSnapshot,
  ReviewPersistenceStatus,
} from './reviewPersistenceReducer';

/**
 * Review persistence (ADR 0005): saves reviewed import values for one
 * Review import. Callers edit, flush, retry and read status; the debounce,
 * persist baselines, batch PATCH and per-row state machine stay behind it.
 */
export interface ReviewPersistence {
  /** Optimistically patch the working copy and queue it for a debounced save. */
  edit: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  /** Commit queued edits now and wait until nothing is saving. `ok` is false if any row failed. */
  flush: () => Promise<{ ok: boolean }>;
  /** Re-send the current dirty diff of failed rows. */
  retry: () => Promise<void>;
  /** Drop queued work and state; subscribers are told once. */
  release: () => void;
  getSnapshot: () => ReviewPersistenceSnapshot;
  subscribe: (listener: () => void) => () => void;
  /** Aborts the first time new work begins saving; used to drop obsolete requests. */
  signalUntilDirty: () => AbortSignal;
}

const isRowUpdateMutation = (
  mutation: PendingMutation<ImportReviewRow> | undefined
): mutation is PendingMutation<ImportReviewRow, 'update'> =>
  mutation?.type === 'update';

const idleSnapshot = deriveReviewPersistence(initialReviewPersistenceState);

const instances = new Map<string, ReviewPersistence>();

const createReviewPersistence = (draftId: string): ReviewPersistence => {
  let released = false;
  let state: ReviewPersistenceState = initialReviewPersistenceState;
  let snapshot = idleSnapshot;
  const listeners = new Set<() => void>();
  const baselines: PersistBaselines = new Map();
  let dirtyController: AbortController | undefined;

  // Trailing timer so flush can commit before the wait elapses, and a newer
  // edit can persist while an older save is still in flight.
  let latestTx: Transaction<ImportReviewRow> | null = null;
  /** Latest household working-set scope wins for the whole debounced batch commit. */
  let persistScope: WorkingSetScope | null = null;
  let commitTimer: ReturnType<typeof setTimeout> | undefined;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const dispatch = (event: ReviewPersistenceEvent) => {
    const next = reduceReviewPersistence(state, event);
    if (next === state) return;
    const previousStatus = snapshot.status;
    state = next;
    snapshot = deriveReviewPersistence(next);
    const beganNewWork =
      event.type === 'edited' ||
      (snapshot.status === 'saving' && previousStatus !== 'saving');
    if (beganNewWork && dirtyController) {
      const controller = dirtyController;
      dirtyController = undefined;
      controller.abort();
    }
    notify();
  };

  const clearCommitTimer = () => {
    if (commitTimer === undefined) return;
    clearTimeout(commitTimer);
    commitTimer = undefined;
  };

  const mutationFn = async ({
    transaction,
  }: {
    transaction: Transaction<ImportReviewRow>;
  }) => {
    const scope = persistScope ?? beginWorkingSetScope();
    const collection = getImportDraftRowsCollection(draftId);
    const attempts = transaction.mutations
      .filter(isRowUpdateMutation)
      .map((mutation) => {
        const rowId = mutation.key;
        const attempted = mutation.modified;
        const original = mutation.original;
        const live = collection.get(rowId) ?? attempted;
        const patch = buildImportDraftRowPersistPatch({
          draftId,
          baselines,
          failedKeys: snapshot.failedFieldKeys.get(rowId) ?? [],
          live,
          changedPatch: toValidatorPatch(mutation.changes),
        });
        return { rowId, patch, attempted, original };
      });

    if (!scope.isCurrent()) {
      dispatch({
        type: 'edits_dropped',
        rowIds: attempts.map((entry) => entry.rowId),
      });
      return;
    }

    await persistImportDraftBatch({
      draftId,
      scope,
      attempts,
      baselines,
      dispatch,
    });
  };

  const commitLatest = async () => {
    const tx = latestTx;
    if (!tx) return;
    if (tx.state === 'pending') {
      await tx.commit().catch(() => undefined);
      return;
    }
    if (tx.state === 'persisting') {
      await tx.when('settled').catch(() => undefined);
    }
  };

  const scheduleCommit = () => {
    clearCommitTimer();
    commitTimer = setTimeout(() => {
      commitTimer = undefined;
      void commitLatest();
    }, REVIEW_PERSISTENCE_PACE_WAIT_MS);
  };

  const waitUntilNotSaving = () =>
    new Promise<void>((resolve) => {
      const check = () => {
        if (snapshot.status !== 'saving') {
          listeners.delete(check);
          resolve();
        }
      };
      listeners.add(check);
      check();
    });

  const edit: ReviewPersistence['edit'] = (rowId, rawPatch) => {
    const patch = sanitizeImportMatchPatch(draftId, rawPatch);
    if (Object.keys(patch).length === 0) return;
    persistScope = beginWorkingSetScope();

    const live = getImportDraftRowsCollection(draftId).get(rowId);
    if (live) seedPersistBaseline(baselines, live);

    const tx =
      latestTx?.state === 'pending'
        ? latestTx
        : createTransaction<ImportReviewRow>({
            autoCommit: false,
            mutationFn,
          });
    latestTx = tx;
    tx.mutate(() => {
      dispatch({ type: 'edited', rowId });
      applyOptimisticRowPatch(draftId, rowId, patch);
    });
    scheduleCommit();
  };

  const flush: ReviewPersistence['flush'] = async () => {
    clearCommitTimer();
    await commitLatest();
    await waitUntilNotSaving();
    // Released work was dropped, never saved.
    return { ok: !released && snapshot.status !== 'failed' };
  };

  const retry: ReviewPersistence['retry'] = async () => {
    const collection = getImportDraftRowsCollection(draftId);
    const attempts = [...snapshot.failedFieldKeys].flatMap(
      ([rowId, failedKeys]) => {
        const live = collection.get(rowId);
        if (!live) return [];
        const patch = buildImportDraftRowPersistPatch({
          draftId,
          baselines,
          failedKeys,
          live,
          changedPatch: null,
        });
        if (Object.keys(patch).length === 0) return [];
        return [{ rowId, patch, attempted: live }];
      }
    );
    if (attempts.length === 0) return;

    const scope = beginWorkingSetScope();
    if (!scope.isCurrent()) return;

    await persistImportDraftBatch({
      draftId,
      scope,
      attempts,
      baselines,
      dispatch,
    });
  };

  const release: ReviewPersistence['release'] = () => {
    released = true;
    clearCommitTimer();
    if (latestTx?.state === 'pending') latestTx.rollback();
    latestTx = null;
    state = initialReviewPersistenceState;
    snapshot = idleSnapshot;
    baselines.clear();
    dirtyController = undefined;
    // Wake anything waiting on this draft (e.g. flush) before forgetting listeners.
    notify();
    listeners.clear();
    if (instances.get(draftId) === instance) instances.delete(draftId);
  };

  const subscribe: ReviewPersistence['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const signalUntilDirty: ReviewPersistence['signalUntilDirty'] = () => {
    dirtyController ??= new AbortController();
    return dirtyController.signal;
  };

  const instance: ReviewPersistence = {
    edit,
    flush,
    retry,
    release,
    getSnapshot: () => snapshot,
    subscribe,
    signalUntilDirty,
  };
  return instance;
};

export const getReviewPersistence = (draftId: string): ReviewPersistence => {
  const existing = instances.get(draftId);
  if (existing) return existing;
  const created = createReviewPersistence(draftId);
  instances.set(draftId, created);
  return created;
};

/** Household / working-set switch: release every draft's Review persistence. */
export const releaseAllReviewPersistence = () => {
  for (const instance of [...instances.values()]) instance.release();
};
