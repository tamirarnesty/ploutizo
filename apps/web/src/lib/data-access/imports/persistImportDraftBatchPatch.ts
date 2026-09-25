import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { WorkingSetScope } from '@/lib/access/working-set-registry';
import { fetchUpdateImportDraftRows } from './fetchUpdateImportDraftRows';
import { confirmPersistIntoCollection } from './importDraftRowPersistConfirm';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import {
  markImportReviewPersistFailure,
  markImportReviewPersistStart,
  markImportReviewPersistSuccess,
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
    for (const entry of attempts) {
      markImportReviewPersistStart(draftId, entry.rowId);
      markImportReviewPersistSuccess(draftId, entry.rowId);
    }
    return true;
  }

  const rowIds = nonEmpty.map((entry) => entry.rowId);
  const persistedKeysByRow = new Map(
    nonEmpty.map((entry) => [entry.rowId, Object.keys(entry.patch)])
  );

  return runImportDraftPersist({
    scope,
    onStart: () => {
      for (const rowId of rowIds) {
        markImportReviewPersistStart(draftId, rowId);
      }
    },
    persist: () => {
      const rows: ImportDraftRowBatchUpdate[] = nonEmpty.map(
        ({ rowId, patch }) => ({ id: rowId, ...patch })
      );
      return fetchUpdateImportDraftRows(draftId, rows);
    },
    onSuccess: (result) => {
      const serverById = new Map(result.rows.map((row) => [row.id, row]));
      // #region agent log
      fetch(
        'http://127.0.0.1:7685/ingest/139f1bc1-2326-4777-9423-3307c3c9b05f',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': 'ea4b96',
          },
          body: JSON.stringify({
            sessionId: 'ea4b96',
            hypothesisId: 'H1',
            location: 'persistImportDraftBatchPatch.ts:onSuccess',
            message: 'batch persist success',
            data: { persistedRowIds: nonEmpty.map((e) => e.rowId) },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => {});
      // #endregion

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
        const keys = persistedKeysByRow.get(entry.rowId) ?? [];
        markImportReviewPersistSuccess(draftId, entry.rowId, keys);
      }

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
        const keys = persistedKeysByRow.get(entry.rowId) ?? [];
        markImportReviewPersistFailure(draftId, entry.rowId, keys);
      }
      rederiveImportDraftWorkingCopy(draftId);
    },
  });
};
