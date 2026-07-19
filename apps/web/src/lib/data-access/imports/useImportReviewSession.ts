import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from '@tanstack/react-db';
import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import {
  getImportReviewAutosaveSnapshot,
  releaseImportReviewAutosave,
  subscribeImportReviewAutosave,
  waitForImportReviewAutosaveSettled,
} from './importReviewAutosave';
import {
  flushImportDraftRowPacedMutations,
  getImportDraftRowPacedMutations,
  releaseImportDraftRowPacedMutations,
  retryFailedImportDraftRowPersists,
} from './getImportDraftRowPacedMutations';
import {
  getImportDraftRowsCollection,
  releaseImportDraftRowsCollection,
} from './getImportDraftRowsCollection';
import {
  persistImportDraftSelection,
  retryFailedImportDraftSelection,
} from './persistImportDraftSelection';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';
import { toImportDraftMeta } from './toImportDraftMeta';
import type { ImportReviewAutosaveStatus } from './importReviewAutosave';
import type { ImportDraftMeta } from './toImportDraftMeta';

export interface ImportReviewSession {
  meta: ImportDraftMeta | undefined;
  rows: ImportDraftRow[];
  isLoading: boolean;
  isError: boolean;
  /** Single write surface for reviewed import values (ADR 0005). */
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  /** Import-set selection: collection first, then bulk selection API. */
  setSelection: (rowIds: string[], selectedForImport: boolean) => void;
  autosaveStatus: ImportReviewAutosaveStatus;
  failedRowIds: string[];
  hasUnsavedWork: boolean;
  retryAutosave: () => void;
  /** Flush pending paced work. Returns false when Failed remains. */
  flush: () => Promise<boolean>;
}

/**
 * Review-session working-copy façade (ADR 0005).
 * Hydrates rows collection + slim meta from one draft GET while the review route is mounted.
 */
export const useImportReviewSession = (
  draftId: string
): ImportReviewSession => {
  const rowsCollection = useMemo(
    () => getImportDraftRowsCollection(draftId),
    [draftId]
  );

  const autosave = useSyncExternalStore(
    (onStoreChange) => subscribeImportReviewAutosave(draftId, onStoreChange),
    () => getImportReviewAutosaveSnapshot(draftId),
    () => getImportReviewAutosaveSnapshot(draftId)
  );

  useEffect(() => {
    return () => {
      releaseImportDraftRowPacedMutations(draftId);
      releaseImportReviewAutosave(draftId);
      void releaseImportDraftRowsCollection(draftId);
    };
  }, [draftId]);

  const metaQuery = useQuery({
    queryKey: importDraftQueryKey(draftId),
    queryFn: () => fetchImportDraft(draftId),
    select: toImportDraftMeta,
  });

  const liveRows = useLiveQuery(
    (q) =>
      q
        .from({ row: rowsCollection })
        .orderBy(({ row }) => row.rowNumber, 'asc'),
    [rowsCollection]
  );

  const rows = liveRows.data;

  const updateRow = useCallback(
    (rowId: string, patch: UpdateImportDraftRowInput) => {
      getImportDraftRowPacedMutations(draftId, rowId)({ patch });
    },
    [draftId]
  );

  const setSelection = useCallback(
    (rowIds: string[], selectedForImport: boolean) => {
      persistImportDraftSelection(draftId, rowIds, selectedForImport);
    },
    [draftId]
  );

  const retryAutosave = useCallback(() => {
    void (async () => {
      await retryFailedImportDraftRowPersists(draftId);
      retryFailedImportDraftSelection(draftId);
    })();
  }, [draftId]);

  const flush = useCallback(async () => {
    await flushImportDraftRowPacedMutations(draftId);
    await waitForImportReviewAutosaveSettled(draftId);
    return getImportReviewAutosaveSnapshot(draftId).status !== 'failed';
  }, [draftId]);

  // Draft GET failure is authoritative — collection sync may not surface the same error flag.
  return {
    meta: metaQuery.data,
    rows,
    isLoading:
      metaQuery.isPending ||
      (metaQuery.isSuccess && liveRows.isLoading && rows.length === 0),
    isError: metaQuery.isError,
    updateRow,
    setSelection,
    autosaveStatus: autosave.status,
    failedRowIds: autosave.failedRowIds,
    hasUnsavedWork: autosave.hasUnsavedWork,
    retryAutosave,
    flush,
  };
};
