import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { getApiErrorCode } from '@/lib/queryClient';
import { useGetHouseholdSettings } from '@/lib/data-access/household/useGetHouseholdSettings';
import {
  flushImportDraftPacedMutations,
  getImportDraftPacedMutations,
  retryFailedImportDraftPersists,
} from './getImportDraftPacedMutations';
import { releaseImportDraftReviewRuntime } from './releaseImportDraftReviewRuntime';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { seedImportDraftPersistBaselines } from './importDraftPersistBaselines';
import {
  applyImportReviewEntrySelection,
  syncImportReviewSelectionOnStatusChange,
} from './importReviewSelectionSession';
import { setImportDraftSelection } from './setImportDraftSelection';
import {
  getImportReviewAutosaveSnapshot,
  waitForImportReviewAutosaveSettled,
} from './importReviewAutosave';
import { isImportRowSelectedForImport } from './importReviewSelection';
import { cancelImportDraftQueryFetches } from './cancelImportDraftQueryFetches';
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
  /** Re-apply entry selection defaults (e.g. after Finalize → Review). */
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
  const settingsQuery = useGetHouseholdSettings();
  const autoCheckImportRowWhenReady =
    settingsQuery.data?.autoCheckImportRowWhenReady ?? false;
  const previousStatusByIdRef = useRef<Map<string, ImportReviewRow['status']>>(
    new Map()
  );

  useEffect(() => {
    previousStatusByIdRef.current = new Map();
  }, [draftId]);

  useEffect(() => {
    return () => {
      releaseImportDraftReviewRuntime(draftId);
    };
  }, [draftId]);

  const metaQuery = useHouseholdQuery({
    ...importDraftQueryOptions(draftId),
    select: toImportDraftMeta,
  });

  const draftNotFound =
    metaQuery.isError && getApiErrorCode(metaQuery.error) === 'NOT_FOUND';

  useEffect(() => {
    if (!draftNotFound) return;
    void cancelImportDraftQueryFetches(draftId);
  }, [draftId, draftNotFound]);

  const liveRows = useLiveQuery(
    (q) =>
      q
        .from({ row: rowsCollection })
        .orderBy(({ row }) => row.rowNumber, 'asc'),
    [rowsCollection]
  );

  useEffect(() => {
    seedImportDraftPersistBaselines(draftId, liveRows.data);
  }, [draftId, liveRows.data]);

  const rows = useMemo(
    () =>
      liveRows.data.map((row) => {
        const selectedForImport = isImportRowSelectedForImport(
          row.selectedForImport
        );
        return row.selectedForImport === selectedForImport
          ? row
          : { ...row, selectedForImport };
      }),
    [liveRows.data]
  );

  useEffect(() => {
    syncImportReviewSelectionOnStatusChange({
      draftId,
      rows,
      previousStatusById: previousStatusByIdRef.current,
      autoCheckImportRowWhenReady,
    });
    previousStatusByIdRef.current = new Map(
      rows.map((row) => [row.id, row.status])
    );
  }, [draftId, rows, autoCheckImportRowWhenReady]);

  const pacedMutate = useMemo(
    () => getImportDraftPacedMutations(draftId),
    [draftId]
  );

  const updateRow = useCallback(
    (rowId: string, patch: UpdateImportDraftRowInput) => {
      pacedMutate({ rowId, patch });
    },
    [pacedMutate]
  );

  const setSelection = useCallback(
    (rowIds: string[], selectedForImport: boolean) => {
      setImportDraftSelection(draftId, rowIds, selectedForImport);
    },
    [draftId]
  );

  const resetSelectionToEntryDefaults = useCallback(() => {
    const currentRows = rowsCollection.toArray;
    applyImportReviewEntrySelection(draftId, currentRows);
  }, [draftId, rowsCollection]);

  const retryAutosave = useCallback(() => {
    void retryFailedImportDraftPersists(draftId);
  }, [draftId]);

  const flush = useCallback(async () => {
    await flushImportDraftPacedMutations(draftId);
    await waitForImportReviewAutosaveSettled(draftId);
    return getImportReviewAutosaveSnapshot(draftId).status !== 'failed';
  }, [draftId]);

  // Draft GET failure is authoritative — collection sync may not surface the same error flag.
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
