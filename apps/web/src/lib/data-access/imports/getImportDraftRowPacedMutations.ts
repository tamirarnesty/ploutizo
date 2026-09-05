import { createPacedMutations, debounceStrategy } from '@tanstack/db';
import type {
  ImportDraftPersistedRow,
  ImportDraftRow,
  UpdateImportDraftRowResult,
} from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import {
  getImportReviewAutosaveSnapshot,
  markImportReviewPending,
  markImportReviewPersistFailure,
  markImportReviewPersistStart,
  markImportReviewPersistSuccess,
} from './importReviewAutosave';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { fetchUpdateImportDraftRow } from './fetchUpdateImportDraftRow';
import { applyImportDraftRefundTargetFactDelta } from './mergeImportDraftRefundTargetFacts';
import {
  evaluateImportDraftWorkingCopy,
  rederiveImportDraftWorkingCopy,
} from './rederiveImportDraftWorkingCopy';
import type { Transaction } from '@tanstack/db';

export const IMPORT_ROW_PACE_WAIT_MS = 500;

// Selection persists via bulk selection API (persistImportDraftSelection), not paced row PATCH.
const REVIEW_PATCH_KEYS = [
  'reviewDate',
  'reviewAmount',
  'reviewType',
  'reviewDescription',
  'reviewCategoryId',
  'reviewAssigneeMemberIds',
  'reviewCounterpartAccountId',
  'reviewRefundOf',
  'reviewRefundLinkHint',
  'reviewMatchedTransactionId',
  'reviewMatchDismissed',
  'reviewNotes',
  'reviewTagIds',
] as const satisfies readonly (keyof UpdateImportDraftRowInput)[];

export interface ImportDraftRowPatchVariables {
  patch: UpdateImportDraftRowInput;
}

const toValidatorPatch = (
  changes: Partial<ImportDraftRow>
): UpdateImportDraftRowInput | null => {
  const patch: Record<string, unknown> = {};
  for (const key of REVIEW_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      patch[key] = changes[key];
    }
  }
  return Object.keys(patch).length > 0
    ? (patch as UpdateImportDraftRowInput)
    : null;
};

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
};

const patchKeys = (patch: UpdateImportDraftRowInput) =>
  Object.keys(patch) as (keyof UpdateImportDraftRowInput)[];

/** Live diverged from this mutation on a patched field after the attempt snapshot. */
const isLiveNewerField = (
  live: ImportDraftRow,
  attempted: ImportDraftRow,
  original: ImportDraftRow,
  key: keyof UpdateImportDraftRowInput
) =>
  !valuesEqual(live[key], attempted[key]) &&
  !valuesEqual(live[key], original[key]);

const syncRefundTargetFacts = (
  draftId: string,
  patch: UpdateImportDraftRowInput,
  original: ImportDraftRow,
  refundTargetFacts?: UpdateImportDraftRowResult['refundTargetFacts']
) => {
  const touchedRefundOf = Object.prototype.hasOwnProperty.call(
    patch,
    'reviewRefundOf'
  );
  const collection = getImportDraftRowsCollection(draftId);
  applyImportDraftRefundTargetFactDelta(draftId, {
    merge: refundTargetFacts,
    previousRefundOf: touchedRefundOf ? original.reviewRefundOf : undefined,
    nextRefundOf: touchedRefundOf ? patch.reviewRefundOf : undefined,
    rows: collection.toArray,
  });
};

/**
 * Confirm persisted durable fields into the synced store without clobbering a
 * newer live edit. Always re-derive — never merge server status / invalidReason.
 * Always writeUpdate before mutationFn returns so dropping optimistic state does not regress.
 */
const confirmPersistIntoCollection = (
  collection: ReturnType<typeof getImportDraftRowsCollection>,
  server: UpdateImportDraftRowResult | null,
  attempted: ImportDraftRow,
  original: ImportDraftRow,
  patch: UpdateImportDraftRowInput,
  draftId: string
) => {
  const serverRow = server?.row ?? null;
  const live = collection.get(attempted.id);

  if (!serverRow) {
    collection.utils.writeUpdate(live ?? attempted);
    rederiveImportDraftWorkingCopy(draftId);
    return;
  }

  const keys = patchKeys(patch);
  const preferLive =
    live !== undefined &&
    keys.some((key) => isLiveNewerField(live, attempted, original, key));
  const next: ImportDraftRow = { ...(preferLive ? live : attempted) };

  for (const key of keys) {
    Object.assign(next, {
      [key]:
        live !== undefined && isLiveNewerField(live, attempted, original, key)
          ? live[key]
          : serverRow[key as keyof ImportDraftPersistedRow],
    });
  }

  if (!preferLive) {
    const timestampSource = live ?? next;
    if (serverRow.updatedAt >= timestampSource.updatedAt) {
      next.updatedAt = serverRow.updatedAt;
    }
  }

  collection.utils.writeUpdate(next);
  syncRefundTargetFacts(draftId, patch, original, server?.refundTargetFacts);
  rederiveImportDraftWorkingCopy(draftId);
};

const patchFromLiveKeys = (
  live: ImportDraftRow,
  keys: string[]
): UpdateImportDraftRowInput | null => {
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    if ((REVIEW_PATCH_KEYS as readonly string[]).includes(key)) {
      patch[key] = live[key as keyof ImportDraftRow];
    }
  }
  return Object.keys(patch).length > 0
    ? (patch as UpdateImportDraftRowInput)
    : null;
};

const applyOptimisticRowPatch = (
  draftId: string,
  rowId: string,
  patch: UpdateImportDraftRowInput
) => {
  const collection = getImportDraftRowsCollection(draftId);
  const rowsForEval = collection.toArray.map((row) =>
    row.id === rowId ? { ...row, ...patch } : row
  );
  const evaluations = evaluateImportDraftWorkingCopy(draftId, rowsForEval);

  collection.update(rowId, (draft) => {
    Object.assign(draft, patch);
    const evaluation = evaluations?.get(rowId);
    if (!evaluation) return;
    draft.status = evaluation.status;
    draft.invalidReason = evaluation.invalidReason;
  });

  if (evaluations) {
    rederiveImportDraftWorkingCopy(draftId, {
      evaluations,
      skipIds: new Set([rowId]),
    });
  }
};

const createRowPacedMutations = (draftId: string, rowId: string) => {
  const strategy = debounceStrategy({ wait: IMPORT_ROW_PACE_WAIT_MS });
  let latestTx: Transaction | null = null;

  const mutate = createPacedMutations<ImportDraftRowPatchVariables>({
    onMutate: ({ patch }) => {
      markImportReviewPending(draftId, rowId);
      applyOptimisticRowPatch(draftId, rowId, patch);
    },
    mutationFn: async ({ transaction }) => {
      markImportReviewPersistStart(draftId, rowId);
      const collection = getImportDraftRowsCollection(draftId);
      const mutation = transaction.mutations.find(
        (entry) => entry.key === rowId
      );
      if (!mutation || mutation.type !== 'update') {
        markImportReviewPersistSuccess(draftId, rowId);
        return;
      }

      const attempted = mutation.modified as unknown as ImportDraftRow;
      const original = mutation.original as unknown as ImportDraftRow;
      const changedPatch = toValidatorPatch(mutation.changes);
      // Further edits after Failed re-persist prior failed fields from live state (PRD story 11).
      const failedKeys =
        getImportReviewAutosaveSnapshot(draftId).failedFieldKeys.get(rowId) ??
        [];
      const live = collection.get(rowId) ?? attempted;
      const retryFailedPatch = patchFromLiveKeys(live, failedKeys);
      const patch = {
        ...(retryFailedPatch ?? {}),
        ...(changedPatch ?? {}),
      } as UpdateImportDraftRowInput;

      if (Object.keys(patch).length === 0) {
        collection.utils.writeUpdate(attempted);
        rederiveImportDraftWorkingCopy(draftId);
        markImportReviewPersistSuccess(draftId, rowId);
        return;
      }

      const persistedKeys = Object.keys(patch);
      try {
        const server = await fetchUpdateImportDraftRow(rowId, patch);
        confirmPersistIntoCollection(
          collection,
          server,
          attempted,
          original,
          patch,
          draftId
        );
        markImportReviewPersistSuccess(draftId, rowId, persistedKeys);
      } catch {
        // Keep working-copy edits (ADR 0005) — do not throw (avoids optimistic rollback).
        confirmPersistIntoCollection(
          collection,
          null,
          attempted,
          original,
          patch,
          draftId
        );
        markImportReviewPersistFailure(draftId, rowId, persistedKeys);
      }
    },
    strategy,
  });

  const wrappedMutate = (variables: ImportDraftRowPatchVariables) => {
    const tx = mutate(variables);
    latestTx = tx;
    return tx;
  };

  const flush = async () => {
    // Cancel the debounce timer, then commit any still-pending transaction.
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
  const prefix = `${draftId}:`;
  await Promise.all(
    [...rowPacedMutations.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, entry]) => entry.flush())
  );
};

/** Re-persist failed row fields from the live working copy (not via debounce). */
export const retryFailedImportDraftRowPersists = async (draftId: string) => {
  const snapshot = getImportReviewAutosaveSnapshot(draftId);
  const collection = getImportDraftRowsCollection(draftId);
  const failures = [...snapshot.failedFieldKeys.entries()];

  await Promise.all(
    failures.map(async ([rowId, keys]) => {
      const live = collection.get(rowId);
      if (!live) return;
      const patch = patchFromLiveKeys(live, [...keys]);
      if (!patch) return;

      markImportReviewPersistStart(draftId, rowId);
      const persistedKeys = Object.keys(patch);
      try {
        const server = await fetchUpdateImportDraftRow(rowId, patch);
        confirmPersistIntoCollection(
          collection,
          server,
          live,
          live,
          patch,
          draftId
        );
        // Explicit Retry: clear all tracked failures for the row.
        markImportReviewPersistSuccess(draftId, rowId);
      } catch {
        const current = collection.get(rowId);
        if (current) collection.utils.writeUpdate(current);
        rederiveImportDraftWorkingCopy(draftId);
        markImportReviewPersistFailure(draftId, rowId, persistedKeys);
      }
    })
  );
};

export const releaseImportDraftRowPacedMutations = (draftId: string) => {
  for (const [key, entry] of rowPacedMutations) {
    if (!key.startsWith(`${draftId}:`)) continue;
    entry.cleanup();
    rowPacedMutations.delete(key);
  }
};

export const resetImportDraftRowPacedMutationsForTests = () => {
  for (const entry of rowPacedMutations.values()) {
    entry.cleanup();
  }
  rowPacedMutations.clear();
};
