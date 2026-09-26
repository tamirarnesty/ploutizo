import { createPacedMutations, debounceStrategy } from '@tanstack/db';
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

const createDraftPacedMutations = (draftId: string) => {
  const strategy = debounceStrategy({
    wait: IMPORT_DRAFT_PACE_WAIT_MS,
    trailing: true,
  });
  let latestTx: Transaction<ImportReviewRow> | null = null;
  /** Latest household working-set scope wins for the whole debounced batch commit. */
  let persistScope: WorkingSetScope | null = null;

  const mutate = createPacedMutations<
    ImportDraftRowPatchVariables,
    ImportReviewRow
  >({
    onMutate: ({ rowId, patch }) => {
      markImportReviewPending(draftId, rowId);
      applyOptimisticRowPatch(draftId, rowId, patch);
    },
    mutationFn: async ({ transaction }) => {
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
    },
    strategy,
  });

  const wrappedMutate = (variables: ImportDraftRowPatchVariables) => {
    const patch = sanitizeImportMatchPatch(draftId, variables.patch);
    if (Object.keys(patch).length === 0) return;
    persistScope = beginWorkingSetScope();
    const tx = mutate({ rowId: variables.rowId, patch });
    latestTx = tx;
    return tx;
  };

  const flush = async () => {
    strategy.cleanup();
    const tx = latestTx;
    if (!tx) return;
    if (tx.state === 'pending') {
      await tx.commit().catch(() => undefined);
      return;
    }
    if (tx.state === 'persisting') {
      await tx.isPersisted.promise.catch(() => undefined);
    }
  };

  return {
    mutate: wrappedMutate,
    flush,
    cleanup: () => strategy.cleanup(),
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
