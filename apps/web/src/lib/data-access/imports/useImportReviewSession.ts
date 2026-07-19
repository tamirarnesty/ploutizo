import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from '@tanstack/react-db';
import type { ImportDraftRow } from '@ploutizo/types';
import {
  getImportDraftRowsCollection,
  releaseImportDraftRowsCollection,
} from './getImportDraftRowsCollection';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';
import { toImportDraftMeta } from './toImportDraftMeta';
import type { ImportDraftMeta } from './toImportDraftMeta';

export interface ImportReviewSession {
  meta: ImportDraftMeta | undefined;
  rows: ImportDraftRow[];
  isLoading: boolean;
  isError: boolean;
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

  // Draft GET failure is authoritative — collection sync may not surface the same error flag.
  return {
    meta: metaQuery.data,
    rows,
    isLoading:
      metaQuery.isPending ||
      (metaQuery.isSuccess && liveRows.isLoading && rows.length === 0),
    isError: metaQuery.isError,
  };
};
