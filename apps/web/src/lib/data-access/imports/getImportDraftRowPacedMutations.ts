import { createPacedMutations, debounceStrategy } from '@tanstack/db';
import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { beginWorkingSetScope } from '@/lib/access/working-set-registry';
import type { WorkingSetScope } from '@/lib/access/working-set-registry';
import {
  getImportReviewAutosaveSnapshot,
  markImportReviewPending,
  markImportReviewPersistStart,
  markImportReviewPersistSuccess,
} from './importReviewAutosave';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { sanitizeImportMatchPatch } from './importMatchTargetOnAccount';
import {
  applyOptimisticRowPatch,
  toValidatorPatch,
} from './importDraftRowOptimisticPatch';
import {
  buildImportDraftRowPersistPatch,
  persistImportDraftRowPatch,
} from './persistImportDraftRowPatch';
import type { PendingMutation, Transaction } from '@tanstack/db';

export const IMPORT_ROW_PACE_WAIT_MS = 500;

export interface ImportDraftRowPatchVariables {
  patch: UpdateImportDraftRowInput;
}

const isRowUpdateMutation = (
  mutation: PendingMutation<ImportReviewRow> | undefined
): mutation is PendingMutation<ImportReviewRow, 'update'> =>
  mutation?.type === 'update';

const createRowPacedMutations = (draftId: string, rowId: string) => {
  const strategy = debounceStrategy({ wait: IMPORT_ROW_PACE_WAIT_MS });
  let latestTx: Transaction<ImportReviewRow> | null = null;
  let persistScope: WorkingSetScope | null = null;

  const mutate = createPacedMutations<
    ImportDraftRowPatchVariables,
    ImportReviewRow
  >({
    onMutate: ({ patch }) => {
      markImportReviewPending(draftId, rowId);
      applyOptimisticRowPatch(draftId, rowId, patch);
    },
    mutationFn: async ({ transaction }) => {
      const scope = persistScope ?? beginWorkingSetScope();
      if (!scope.isCurrent()) {
        return;
      }

      const collection = getImportDraftRowsCollection(draftId);
      const mutation = transaction.mutations.find(
        (entry) => entry.key === rowId
      );
      if (!isRowUpdateMutation(mutation)) {
        markImportReviewPersistStart(draftId, rowId);
        markImportReviewPersistSuccess(draftId, rowId);
        return;
      }

      const attempted = mutation.modified;
      const original = mutation.original;
      const live = collection.get(rowId) ?? attempted;
      const patch = buildImportDraftRowPersistPatch(
        draftId,
        rowId,
        live,
        toValidatorPatch(mutation.changes)
      );

      await persistImportDraftRowPatch({
        draftId,
        rowId,
        scope,
        patch,
        attempted,
        original,
      });
    },
    strategy,
  });

  const wrappedMutate = (variables: ImportDraftRowPatchVariables) => {
    const patch = sanitizeImportMatchPatch(draftId, variables.patch);
    if (Object.keys(patch).length === 0) return;
    persistScope = beginWorkingSetScope();
    const tx = mutate({ patch });
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

type RowPacedEntry = ReturnType<typeof createRowPacedMutations>;

const rowPacedMutations = new Map<string, RowPacedEntry>();

const pacedKey = (draftId: string, rowId: string) => `${draftId}:${rowId}`;

const pacedDraftPrefix = (draftId: string) => `${draftId}:`;

export const getImportDraftRowPacedMutations = (
  draftId: string,
  rowId: string
) => {
  const key = pacedKey(draftId, rowId);
  const existing = rowPacedMutations.get(key);
  if (existing) return existing.mutate;

  const entry = createRowPacedMutations(draftId, rowId);
  rowPacedMutations.set(key, entry);
  return entry.mutate;
};

export const flushImportDraftRowPacedMutations = async (draftId: string) => {
  const prefix = pacedDraftPrefix(draftId);
  await Promise.all(
    [...rowPacedMutations.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, entry]) => entry.flush())
  );
};

export const retryFailedImportDraftRowPersists = async (draftId: string) => {
  const snapshot = getImportReviewAutosaveSnapshot(draftId);
  const collection = getImportDraftRowsCollection(draftId);
  const failures = [...snapshot.failedFieldKeys.entries()];

  await Promise.all(
    failures.map(async ([rowId]) => {
      const live = collection.get(rowId);
      if (!live) return;

      const patch = buildImportDraftRowPersistPatch(draftId, rowId, live, null);
      if (Object.keys(patch).length === 0) return;

      const scope = beginWorkingSetScope();
      if (!scope.isCurrent()) return;

      await persistImportDraftRowPatch({
        draftId,
        rowId,
        scope,
        patch,
        attempted: live,
        original: live,
      });
    })
  );
};

export const releaseImportDraftRowPacedMutations = (draftId: string) => {
  const prefix = pacedDraftPrefix(draftId);
  for (const [key, entry] of rowPacedMutations) {
    if (!key.startsWith(prefix)) continue;
    entry.cleanup();
    rowPacedMutations.delete(key);
  }
};

export const endImportDraftRowPacedMutations = () => {
  for (const entry of rowPacedMutations.values()) {
    entry.cleanup();
  }
  rowPacedMutations.clear();
};
