import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from '@tanstack/react-db';
import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import {
  flushImportDraftRowPacedMutations,
  getImportDraftRowPacedMutations,
  releaseImportDraftRowPacedMutations,
  retryFailedImportDraftRowPersists,
} from './getImportDraftRowPacedMutations';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import {
  persistImportDraftSelection,
  retryFailedImportDraftSelection,
} from './persistImportDraftSelection';
import {
  getImportReviewAutosaveSnapshot,
  releaseImportReviewAutosave,
  waitForImportReviewAutosaveSettled,
} from './importReviewAutosave';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';
import { toImportDraftMeta } from './toImportDraftMeta';
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
  const access = useActiveHouseholdAccess();
  const rowsCollection = useMemo(
    () => getImportDraftRowsCollection(access, draftId),
    [access.signedInMemberId, access.activeHouseholdId, draftId]
  );

  useEffect(() => {
    return () => {
      releaseImportDraftRowPacedMutations(access, draftId);
      releaseImportReviewAutosave(draftId);
    };
  }, [access.signedInMemberId, access.activeHouseholdId, draftId]);

  const metaQuery = useQuery({
    queryKey: importDraftQueryKey(access, draftId),
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
      getImportDraftRowPacedMutations(access, draftId, rowId)({ patch });
    },
    [access.signedInMemberId, access.activeHouseholdId, draftId]
  );

  const setSelection = useCallback(
    (rowIds: string[], selectedForImport: boolean) => {
      persistImportDraftSelection(access, draftId, rowIds, selectedForImport);
    },
    [access.signedInMemberId, access.activeHouseholdId, draftId]
  );

  const retryAutosave = useCallback(() => {
    void (async () => {
      await retryFailedImportDraftRowPersists(access, draftId);
      retryFailedImportDraftSelection(access, draftId);
    })();
  }, [access.signedInMemberId, access.activeHouseholdId, draftId]);

  const flush = useCallback(async () => {
    await flushImportDraftRowPacedMutations(access, draftId);
    await waitForImportReviewAutosaveSettled(draftId);
    return getImportReviewAutosaveSnapshot(draftId).status !== 'failed';
  }, [access.signedInMemberId, access.activeHouseholdId, draftId]);

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
  };
};
