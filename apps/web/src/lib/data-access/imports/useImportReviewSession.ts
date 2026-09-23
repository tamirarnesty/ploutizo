import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { useGetHouseholdSettings } from '@/lib/data-access/household';
import {
  flushImportDraftPacedMutations,
  getImportDraftPacedMutations,
  releaseImportDraftPacedMutations,
  retryFailedImportDraftPersists,
} from './getImportDraftPacedMutations';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { setImportDraftSelection } from './setImportDraftSelection';
import {
  releaseImportDraftPersistBaselines,
  seedImportDraftPersistBaselines,
} from './importDraftPersistBaselines';
import {
  applyImportReviewEntrySelection,
  syncImportReviewSelectionOnStatusChange,
} from './importReviewSelectionSession';
import {
  getImportReviewAutosaveSnapshot,
  releaseImportReviewAutosave,
  waitForImportReviewAutosaveSettled,
} from './importReviewAutosave';
import { releaseImportDraftWorkingCopyRederive } from './scheduleImportDraftWorkingCopyRederive';
import { importDraftQueryOptions } from './useGetImportDraft';
import { toImportDraftMeta } from './toImportDraftMeta';
import type { ImportDraftMeta } from './toImportDraftMeta';

export interface ImportReviewSession {
  meta: ImportDraftMeta | undefined;
  rows: ImportReviewRow[];
  isLoading: boolean;
  isError: boolean;
  /** Single write surface for reviewed import values (ADR 0005). */
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  /** Session-only import-set selection (match decisions in working copy; server re-verifies at Continue). */
  setSelection: (rowIds: string[], selectedForImport: boolean) => void;
  retryAutosave: () => void;
  /** Flush pending paced work. Returns false when Failed remains. */
  flush: () => Promise<boolean>;
  /** Reset checkbox import set to Review entry defaults (e.g. back from Finalize). */
  resetSelectionToEntryDefaults: () => void;
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
  const { data: householdSettings } = useGetHouseholdSettings();
  const autoCheckImportRowWhenReady =
    householdSettings?.autoCheckImportRowWhenReady ?? true;

  const appliedEntrySelectionRef = useRef(false);
  const previousStatusByIdRef = useRef<Map<string, ImportReviewRow['status']>>(
    new Map()
  );

  useEffect(() => {
    return () => {
      releaseImportDraftPacedMutations(draftId);
      releaseImportReviewAutosave(draftId);
      releaseImportDraftPersistBaselines(draftId);
      releaseImportDraftWorkingCopyRederive(draftId);
    };
  }, [draftId]);

  const metaQuery = useHouseholdQuery({
    ...importDraftQueryOptions(draftId),
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

  useEffect(() => {
    if (rows.length === 0 || !metaQuery.isSuccess) return;
    seedImportDraftPersistBaselines(draftId, rows);
  }, [draftId, metaQuery.isSuccess, rows]);

  useEffect(() => {
    if (rows.length === 0 || !metaQuery.isSuccess) return;
    if (appliedEntrySelectionRef.current) return;
    const collectionRows = getImportDraftRowsCollection(draftId).toArray;
    applyImportReviewEntrySelection(draftId, collectionRows);
    appliedEntrySelectionRef.current = true;
    previousStatusByIdRef.current = new Map(
      collectionRows.map((row) => [row.id, row.status])
    );
  }, [draftId, metaQuery.isSuccess, rows.length]);

  useEffect(() => {
    if (rows.length === 0) return;
    syncImportReviewSelectionOnStatusChange({
      draftId,
      rows,
      previousStatusById: previousStatusByIdRef.current,
      autoCheckImportRowWhenReady,
    });
    previousStatusByIdRef.current = new Map(
      rows.map((row) => [row.id, row.status])
    );
  }, [autoCheckImportRowWhenReady, draftId, rows]);

  const updateRow = useCallback(
    (rowId: string, patch: UpdateImportDraftRowInput) => {
      getImportDraftPacedMutations(draftId)({ rowId, patch });
    },
    [draftId]
  );

  const setSelection = useCallback(
    (rowIds: string[], selectedForImport: boolean) => {
      void flushImportDraftPacedMutations(draftId).then(() => {
        setImportDraftSelection(draftId, rowIds, selectedForImport);
      });
    },
    [draftId]
  );

  const resetSelectionToEntryDefaults = useCallback(() => {
    const collection = getImportDraftRowsCollection(draftId);
    applyImportReviewEntrySelection(draftId, collection.toArray);
  }, [draftId]);

  const retryAutosave = useCallback(() => {
    void retryFailedImportDraftPersists(draftId);
  }, [draftId]);

  const flush = useCallback(async () => {
    await flushImportDraftPacedMutations(draftId);
    await waitForImportReviewAutosaveSettled(draftId);
    return getImportReviewAutosaveSnapshot(draftId).status !== 'failed';
  }, [draftId]);

  return {
    meta: metaQuery.data,
    rows,
    isLoading:
      metaQuery.isPending ||
      (metaQuery.isSuccess &&
        rows.length === 0 &&
        (liveRows.isLoading || !liveRows.isReady)),
    isError: metaQuery.isError,
    updateRow,
    setSelection,
    retryAutosave,
    flush,
    resetSelectionToEntryDefaults,
  };
};
