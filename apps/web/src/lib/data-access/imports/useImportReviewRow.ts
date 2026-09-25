import { useMemo } from 'react';
import { eq, useLiveQuery } from '@tanstack/react-db';
import type { ImportReviewRow } from '@ploutizo/types';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';

export const useImportReviewRow = (
  draftId: string,
  rowId: string
): ImportReviewRow | undefined => {
  const collection = useMemo(
    () => getImportDraftRowsCollection(draftId),
    [draftId]
  );

  const liveRow = useLiveQuery(
    (q) => {
      if (!rowId) return undefined;
      return q
        .from({ row: collection })
        .where(({ row }) => eq(row.id, rowId))
        .findOne();
    },
    [collection, rowId]
  );

  return liveRow.data;
};
