import { replaceEqualDeep } from '@tanstack/react-query';
import type {
  ImportDraftPersistedRow,
  UpdateImportDraftRowInput,
  UpdateImportDraftRowResult,
} from '@ploutizo/validators';
import type { ImportReviewRow } from '@ploutizo/types';
import type { WorkingSetScope } from '@/lib/access/working-set-registry';
import { fetchUpdateImportDraftRows } from './fetchUpdateImportDraftRows';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';
import { advancePersistBaselineFromPatch } from './importDraftPersistBaselines';
import { applyImportDraftRefundTargetFactDelta } from './mergeImportDraftRefundTargetFacts';
import type { PersistBaselines } from './importDraftPersistBaselines';
import type { ReviewPersistenceEvent } from './reviewPersistenceReducer';
import type { ImportDraftRowBatchUpdate } from './fetchUpdateImportDraftRows';

export interface ImportDraftRowPersistAttempt {
  rowId: string;
  patch: UpdateImportDraftRowInput;
  attempted: ImportReviewRow;
  original?: ImportReviewRow;
}

const patchKeys = (patch: UpdateImportDraftRowInput) =>
  Object.keys(patch) as (keyof UpdateImportDraftRowInput)[];

const fieldValuesEqual = (left: unknown, right: unknown) =>
  replaceEqualDeep(left, right) === left;

const isLiveNewerField = (
  live: ImportReviewRow,
  attempted: ImportReviewRow,
  original: ImportReviewRow,
  key: keyof UpdateImportDraftRowInput
) =>
  !fieldValuesEqual(live[key], attempted[key]) &&
  !fieldValuesEqual(live[key], original[key]);

const syncRefundTargetFacts = (
  draftId: string,
  patch: UpdateImportDraftRowInput,
  original: ImportReviewRow,
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

export const confirmPersistIntoCollection = (
  collection: ReturnType<typeof getImportDraftRowsCollection>,
  server: UpdateImportDraftRowResult | null,
  attempted: ImportReviewRow,
  original: ImportReviewRow,
  patch: UpdateImportDraftRowInput,
  draftId: string,
  options?: { skipRederive?: boolean; skipRefundFacts?: boolean }
) => {
  const serverRow = server?.row ?? null;
  const live = collection.get(attempted.id);

  if (!serverRow) {
    collection.utils.writeUpdate(live ?? attempted);
    if (!options?.skipRederive) {
      rederiveImportDraftWorkingCopy(draftId);
    }
    return;
  }

  const keys = patchKeys(patch);
  const preferLive =
    live !== undefined &&
    keys.some((key) => isLiveNewerField(live, attempted, original, key));
  const next: ImportReviewRow = { ...(preferLive ? live : attempted) };

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

  if (live) next.selectedForImport = live.selectedForImport;
  if (!live || replaceEqualDeep(live, next) !== live) {
    collection.utils.writeUpdate(next);
  }
  if (!options?.skipRefundFacts) {
    syncRefundTargetFacts(draftId, patch, original, server?.refundTargetFacts);
  }
  if (!options?.skipRederive) {
    rederiveImportDraftWorkingCopy(draftId);
  }
};

/** Internal adapter of Review persistence: sends a batch and reports outcomes to its state machine. */
export const persistImportDraftBatch = async ({
  draftId,
  scope,
  attempts,
  baselines,
  dispatch,
}: {
  draftId: string;
  scope: WorkingSetScope;
  attempts: ImportDraftRowPersistAttempt[];
  baselines: PersistBaselines;
  dispatch: (event: ReviewPersistenceEvent) => void;
}): Promise<boolean> => {
  const collection = getImportDraftRowsCollection(draftId);
  const nonEmpty = attempts.filter(
    (entry) => Object.keys(entry.patch).length > 0
  );

  if (nonEmpty.length === 0) {
    const rowIds = attempts.map((entry) => entry.rowId);
    dispatch({ type: 'persist_started', rowIds });
    dispatch({
      type: 'persist_succeeded',
      entries: rowIds.map((rowId) => ({ rowId })),
    });
    return true;
  }

  if (!scope.isCurrent()) {
    return false;
  }

  const rowIds = nonEmpty.map((entry) => entry.rowId);
  const persistedKeysByRow = new Map(
    nonEmpty.map((entry) => [entry.rowId, Object.keys(entry.patch)])
  );

  dispatch({ type: 'persist_started', rowIds });

  try {
    const rows: ImportDraftRowBatchUpdate[] = nonEmpty.map(
      ({ rowId, patch }) => ({ id: rowId, ...patch })
    );
    const result = await fetchUpdateImportDraftRows(draftId, rows);
    if (!scope.isCurrent()) {
      return false;
    }

    const serverById = new Map(result.rows.map((row) => [row.id, row]));

    for (const entry of nonEmpty) {
      const serverRow = serverById.get(entry.rowId);
      const original = entry.original ?? entry.attempted;
      confirmPersistIntoCollection(
        collection,
        serverRow ? { row: serverRow } : null,
        entry.attempted,
        original,
        entry.patch,
        draftId,
        { skipRederive: true, skipRefundFacts: true }
      );
      if (serverRow) {
        advancePersistBaselineFromPatch(baselines, entry.rowId, entry.patch);
      }
    }

    dispatch({
      type: 'persist_succeeded',
      entries: nonEmpty.map((entry) => ({
        rowId: entry.rowId,
        succeededKeys: persistedKeysByRow.get(entry.rowId) ?? [],
      })),
    });

    if (result.refundTargetFacts) {
      applyImportDraftRefundTargetFactDelta(draftId, {
        merge: result.refundTargetFacts,
        rows: collection.toArray,
      });
    }
    rederiveImportDraftWorkingCopy(draftId);
    return true;
  } catch {
    if (!scope.isCurrent()) {
      return false;
    }
    for (const entry of nonEmpty) {
      if (!entry.original) continue;
      confirmPersistIntoCollection(
        collection,
        null,
        entry.attempted,
        entry.original,
        entry.patch,
        draftId,
        { skipRederive: true }
      );
    }
    dispatch({
      type: 'persist_failed',
      entries: nonEmpty.map((entry) => ({
        rowId: entry.rowId,
        fieldKeys: persistedKeysByRow.get(entry.rowId) ?? [],
      })),
    });
    rederiveImportDraftWorkingCopy(draftId);
    return false;
  }
};
