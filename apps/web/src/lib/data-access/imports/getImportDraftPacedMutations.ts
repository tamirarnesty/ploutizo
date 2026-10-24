import { createTransaction } from '@tanstack/db';
import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { beginWorkingSetScope } from '@/lib/access/working-set-registry';
import type { WorkingSetScope } from '@/lib/access/working-set-registry';
import {
  clearImportReviewPendingRows,
  getImportReviewAutosaveSnapshot,
  markImportReviewPending,
} from './importReviewAutosave';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { sanitizeImportMatchPatch } from './importMatchTargetOnAccount';
import {
  applyOptimisticRowPatch,
  toValidatorPatch,
} from './importDraftRowOptimisticPatch';
import { buildImportDraftRowPersistPatch } from './buildImportDraftPersistPatch';
import { persistImportDraftBatch } from './persistImportDraftBatch';
import {
  eachImportDraftReviewRuntime,
  getImportDraftReviewRuntime,
} from './importDraftReviewRuntime';
import type { PendingMutation, Transaction } from '@tanstack/db';

export const IMPORT_DRAFT_PACE_WAIT_MS = 3000;

/**
 * Debounced review persist pipeline (see ADR 0005):
 * mutate → optimistic patch + autosave pending → debounce → build persist patch
 * → batch PATCH → confirm collection + baselines → rederive → autosave saved/failed.
 */

export interface ImportDraftRowPatchVariables {
  rowId: string;
  patch: UpdateImportDraftRowInput;
}

const isRowUpdateMutation = (
  mutation: PendingMutation<ImportReviewRow> | undefined
): mutation is PendingMutation<ImportReviewRow, 'update'> =>
  mutation?.type === 'update';

/** Trailing timer so Continue can commit before the wait elapses, and a newer edit can persist while an older save is still in flight. */
const createDraftPacedMutations = (draftId: string) => {
  let latestTx: Transaction<ImportReviewRow> | null = null;
  /** Latest household working-set scope wins for the whole debounced batch commit. */
  let persistScope: WorkingSetScope | null = null;
  let commitTimer: ReturnType<typeof setTimeout> | undefined;

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
        const patch = buildImportDraftRowPersistPatch(
          draftId,
          rowId,
          live,
          toValidatorPatch(mutation.changes)
        );
        return { rowId, patch, attempted, original };
      });

    if (!scope.isCurrent()) {
      clearImportReviewPendingRows(
        draftId,
        attempts.map((entry) => entry.rowId)
      );
      return;
    }

    await persistImportDraftBatch({
      draftId,
      scope,
      attempts,
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
    if (commitTimer !== undefined) clearTimeout(commitTimer);
    commitTimer = setTimeout(() => {
      commitTimer = undefined;
      void commitLatest();
    }, IMPORT_DRAFT_PACE_WAIT_MS);
  };

  const wrappedMutate = (variables: ImportDraftRowPatchVariables) => {
    const patch = sanitizeImportMatchPatch(draftId, variables.patch);
    if (Object.keys(patch).length === 0) return;
    persistScope = beginWorkingSetScope();

    const tx =
      latestTx?.state === 'pending'
        ? latestTx
        : createTransaction<ImportReviewRow>({
            autoCommit: false,
            mutationFn,
          });
    latestTx = tx;
    tx.mutate(() => {
      markImportReviewPending(draftId, variables.rowId);
      applyOptimisticRowPatch(draftId, variables.rowId, patch);
    });
    scheduleCommit();
    return tx;
  };

  const flush = async () => {
    if (commitTimer !== undefined) {
      clearTimeout(commitTimer);
      commitTimer = undefined;
    }
    await commitLatest();
  };

  return {
    mutate: wrappedMutate,
    flush,
    cleanup: () => {
      if (commitTimer !== undefined) {
        clearTimeout(commitTimer);
        commitTimer = undefined;
      }
      if (latestTx?.state === 'pending') latestTx.rollback();
    },
  };
};

type DraftPacedEntry = ReturnType<typeof createDraftPacedMutations>;

export const getImportDraftPacedMutations = (draftId: string) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  if (runtime.paced) return runtime.paced.mutate;

  const entry = createDraftPacedMutations(draftId);
  runtime.paced = entry;
  return entry.mutate;
};

export const flushImportDraftPacedMutations = async (draftId: string) => {
  await getImportDraftReviewRuntime(draftId).paced?.flush();
};

export const retryFailedImportDraftPersists = async (draftId: string) => {
  const snapshot = getImportReviewAutosaveSnapshot(draftId);
  const collection = getImportDraftRowsCollection(draftId);
  const rowIds = new Set(snapshot.failedFieldKeys.keys());

  const attempts = [...rowIds]
    .map((rowId) => {
      const live = collection.get(rowId);
      if (!live) return null;
      const patch = buildImportDraftRowPersistPatch(draftId, rowId, live, null);
      if (Object.keys(patch).length === 0) return null;
      return {
        rowId,
        patch,
        attempted: live,
      };
    })
    .filter((entry) => entry !== null);

  if (attempts.length === 0) return;

  const scope = beginWorkingSetScope();
  if (!scope.isCurrent()) return;

  await persistImportDraftBatch({
    draftId,
    scope,
    attempts,
  });
};

export const releaseImportDraftPacedMutations = (draftId: string) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  runtime.paced?.cleanup();
  runtime.paced = undefined;
};

export const endImportDraftPacedMutations = () => {
  eachImportDraftReviewRuntime((runtime) => {
    runtime.paced?.cleanup();
    runtime.paced = undefined;
  });
};
