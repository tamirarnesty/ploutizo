import type { ImportReviewRow } from '@ploutizo/types';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { isImportRowSelectedForImport } from './importReviewSelection';

/** Prefer the working copy after flush; fall back to rendered rows in isolated tests. */
export const resolveImportContinueRows = (
  draftId: string,
  fallbackRows: readonly ImportReviewRow[]
): ImportReviewRow[] => {
  const fromCollection = getImportDraftRowsCollection(draftId).toArray;
  return fromCollection.length > 0 ? fromCollection : [...fallbackRows];
};

export const resolveImportContinueRowIds = (
  draftId: string,
  fallbackRows: readonly ImportReviewRow[]
): string[] =>
  resolveImportContinueRows(draftId, fallbackRows)
    .filter((row) => isImportRowSelectedForImport(row.selectedForImport))
    .map((row) => row.id);
