import { createPacedMutations, debounceStrategy } from '@tanstack/db';
import {
  deriveImportRowStatus,
  toImportRowStatusFields,
} from '@ploutizo/utils/import-row-status';
import type { ImportDraftRow } from '@ploutizo/types';
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
  'reviewRefundLinkHint',
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

/** True when live holds a value beyond this mutation's original and attempted snapshots. */
const liveHasNewerThanAttempt = (
  live: ImportDraftRow,
  attempted: ImportDraftRow,
  original: ImportDraftRow,
  patch: UpdateImportDraftRowInput
) =>
  patchKeys(patch).some(
    (key) =>
      !valuesEqual(live[key], attempted[key]) &&
      !valuesEqual(live[key], original[key])
  );

/**
 * Confirm persisted state into the synced store without clobbering a newer live edit.
 * Always writeUpdate before mutationFn returns so dropping optimistic state does not regress.
 */
const confirmPersistIntoCollection = (
  collection: ReturnType<typeof getImportDraftRowsCollection>,
  serverRow: ImportDraftRow | null,
  attempted: ImportDraftRow,
  original: ImportDraftRow,
  patch: UpdateImportDraftRowInput
) => {
  const live = collection.get(attempted.id);

  if (!live) {
    collection.utils.writeUpdate(serverRow ?? attempted);
    return;
  }

  if (!serverRow) {
    // Failure: keep whatever is currently live (may already include a newer edit).
    collection.utils.writeUpdate(live);
    return;
  }

  const preferLive = liveHasNewerThanAttempt(live, attempted, original, patch);
  const next: ImportDraftRow = { ...(preferLive ? live : attempted) };

  for (const key of patchKeys(patch)) {
    if (
      preferLive &&
      !valuesEqual(live[key], attempted[key]) &&
      !valuesEqual(live[key], original[key])
    ) {
      Object.assign(next, { [key]: live[key] });
    } else {
      Object.assign(next, { [key]: serverRow[key] });
    }
  }

  // Only take server status/timestamps when this persist still owns the row.
  // Avoid older responses clobbering status derived from newer local field edits.
  if (!preferLive && serverRow.updatedAt >= live.updatedAt) {
    next.updatedAt = serverRow.updatedAt;
    next.status = serverRow.status;
    next.invalidReason = serverRow.invalidReason;
  } else {
    next.status = deriveImportRowStatus(toImportRowStatusFields(next));
  }

  collection.utils.writeUpdate(next);
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

const createRowPacedMutations = (draftId: string, rowId: string) => {
  const strategy = debounceStrategy({ wait: IMPORT_ROW_PACE_WAIT_MS });
  let latestTx: Transaction | null = null;

  const mutate = createPacedMutations<ImportDraftRowPatchVariables>({
    onMutate: ({ patch }) => {
      markImportReviewPending(draftId, rowId);
      const collection = getImportDraftRowsCollection(draftId);
      collection.update(rowId, (draft) => {
        Object.assign(draft, patch);
        draft.status = deriveImportRowStatus(toImportRowStatusFields(draft));
      });
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

      const patch = toValidatorPatch(mutation.changes);
      if (!patch) {
        collection.utils.writeUpdate(
          mutation.modified as unknown as ImportDraftRow
        );
        markImportReviewPersistSuccess(draftId, rowId);
        return;
      }

      const attempted = mutation.modified as unknown as ImportDraftRow;
      const original = mutation.original as unknown as ImportDraftRow;
      const persistedKeys = Object.keys(patch);
      try {
        const serverRow = await fetchUpdateImportDraftRow(rowId, patch);
        confirmPersistIntoCollection(
          collection,
          serverRow,
          attempted,
          original,
          patch
        );
        markImportReviewPersistSuccess(draftId, rowId, persistedKeys);
      } catch {
        // Keep working-copy edits (ADR 0005) — do not throw (avoids optimistic rollback).
        confirmPersistIntoCollection(
          collection,
          null,
          attempted,
          original,
          patch
        );
        markImportReviewPersistFailure(draftId, rowId, Object.keys(patch));
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
      try {
        const serverRow = await fetchUpdateImportDraftRow(rowId, patch);
        confirmPersistIntoCollection(collection, serverRow, live, live, patch);
        markImportReviewPersistSuccess(draftId, rowId);
      } catch {
        const current = collection.get(rowId);
        if (current) collection.utils.writeUpdate(current);
        markImportReviewPersistFailure(draftId, rowId, Object.keys(patch));
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
