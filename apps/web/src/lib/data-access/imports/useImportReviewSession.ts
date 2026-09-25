import { useCallback, useEffect, useMemo } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import {
  flushImportDraftPacedMutations,
  getImportDraftPacedMutations,
  releaseImportDraftPacedMutations,
  retryFailedImportDraftPersists,
} from './getImportDraftPacedMutations';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { seedImportDraftPersistBaselines } from './importDraftPersistBaselines';
import { applyImportReviewEntrySelection } from './importReviewSelectionSession';
import { setImportDraftSelection } from './setImportDraftSelection';
import {
  getImportReviewAutosaveSnapshot,
  releaseImportReviewAutosave,
  waitForImportReviewAutosaveSettled,
} from './importReviewAutosave';
import { isImportRowSelectedForImport } from './importReviewSelection';
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

  useEffect(() => {
    return () => {
      releaseImportDraftPacedMutations(draftId);
      releaseImportReviewAutosave(draftId);
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
      void (async () => {
        await flushImportDraftPacedMutations(draftId);
        setImportDraftSelection(draftId, rowIds, selectedForImport);
      })();
    },
    [draftId]
  );

  const resetSelectionToEntryDefaults = useCallback(() => {
    applyImportReviewEntrySelection(draftId, rows);
  }, [draftId, rows]);

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
