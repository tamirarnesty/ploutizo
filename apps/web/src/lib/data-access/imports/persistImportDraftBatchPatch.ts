import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { WorkingSetScope } from '@/lib/access/working-set-registry';
import { fetchUpdateImportDraftRows } from './fetchUpdateImportDraftRows';
import { confirmPersistIntoCollection } from './importDraftRowPersistConfirm';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import {
  markImportReviewPersistFailureMany,
  markImportReviewPersistStartMany,
  markImportReviewPersistSuccessMany,
} from './importReviewAutosave';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';
import { runImportDraftPersist } from './runImportDraftPersist';
import { advanceImportDraftPersistBaseline } from './importDraftPersistBaselines';
import { applyImportDraftRefundTargetFactDelta } from './mergeImportDraftRefundTargetFacts';
import type { ImportDraftRowBatchUpdate } from './fetchUpdateImportDraftRows';

export interface ImportDraftRowPersistAttempt {
  rowId: string;
  patch: UpdateImportDraftRowInput;
  attempted: ImportReviewRow;
  original: ImportReviewRow;
}

export const persistImportDraftBatchPatch = async ({
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

  const rowIds = nonEmpty.map((entry) => entry.rowId);
  const persistedKeysByRow = new Map(
    nonEmpty.map((entry) => [entry.rowId, Object.keys(entry.patch)])
  );

  return runImportDraftPersist({
    scope,
    onStart: () => {
      markImportReviewPersistStartMany(draftId, rowIds);
    },
    persist: () => {
      const rows: ImportDraftRowBatchUpdate[] = nonEmpty.map(
        ({ rowId, patch }) => ({ id: rowId, ...patch })
      );
      return fetchUpdateImportDraftRows(draftId, rows);
    },
    onSuccess: (result) => {
      const serverById = new Map(result.rows.map((row) => [row.id, row]));

      for (const entry of nonEmpty) {
        const serverRow = serverById.get(entry.rowId);
        confirmPersistIntoCollection(
          collection,
          serverRow ? { row: serverRow } : null,
          entry.attempted,
          entry.original,
          entry.patch,
          draftId,
          { deferRederive: true, deferRefundFactsMerge: true }
        );
        if (serverRow) {
          const live = collection.get(entry.rowId);
          if (live) advanceImportDraftPersistBaseline(draftId, live);
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
    },
    onFailure: () => {
      for (const entry of nonEmpty) {
        confirmPersistIntoCollection(
          collection,
          null,
          entry.attempted,
          entry.original,
          entry.patch,
          draftId,
          { deferRederive: true }
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
    },
  });
};
