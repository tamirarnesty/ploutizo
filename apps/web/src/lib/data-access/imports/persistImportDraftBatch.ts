import { replaceEqualDeep } from '@tanstack/react-query';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type {
  ImportDraftPersistedRow,
  ImportReviewRow,
  UpdateImportDraftRowResult,
} from '@ploutizo/types';
import type { WorkingSetScope } from '@/lib/access/working-set-registry';
import { fetchUpdateImportDraftRows } from './fetchUpdateImportDraftRows';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import {
  markImportReviewPersistFailureMany,
  markImportReviewPersistStartMany,
  markImportReviewPersistSuccessMany,
} from './importReviewAutosave';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';
import { advanceImportDraftPersistBaselineFromPatch } from './importDraftPersistBaselines';
import { applyImportDraftRefundTargetFactDelta } from './mergeImportDraftRefundTargetFacts';
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

export const persistImportDraftBatch = async ({
  draftId,
  scope,
  attempts,
}: {
  draftId: string;
  scope: WorkingSetScope;
  attempts: ImportDraftRowPersistAttempt[];
}): Promise<boolean> => {
  const collection = getImportDraftRowsCollection(draftId);
  const nonEmpty = attempts.filter(
    (entry) => Object.keys(entry.patch).length > 0
  );

  if (nonEmpty.length === 0) {
    const rowIds = attempts.map((entry) => entry.rowId);
    markImportReviewPersistStartMany(draftId, rowIds);
    markImportReviewPersistSuccessMany(
      draftId,
      rowIds.map((rowId) => ({ rowId }))
    );
    return true;
  }

  if (!scope.isCurrent()) {
    return false;
  }

  const rowIds = nonEmpty.map((entry) => entry.rowId);
  const persistedKeysByRow = new Map(
    nonEmpty.map((entry) => [entry.rowId, Object.keys(entry.patch)])
  );

  markImportReviewPersistStartMany(draftId, rowIds);

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
        advanceImportDraftPersistBaselineFromPatch(
          draftId,
          entry.rowId,
          entry.patch
        );
      }
    }

    markImportReviewPersistSuccessMany(
      draftId,
      nonEmpty.map((entry) => ({
        rowId: entry.rowId,
        succeededKeys: persistedKeysByRow.get(entry.rowId) ?? [],
      }))
    );

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
    markImportReviewPersistFailureMany(
      draftId,
      nonEmpty.map((entry) => ({
        rowId: entry.rowId,
        fieldKeys: persistedKeysByRow.get(entry.rowId) ?? [],
      }))
    );
    rederiveImportDraftWorkingCopy(draftId);
    return false;
  }
};
