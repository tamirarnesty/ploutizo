import { isImportRowSelectable } from '@ploutizo/utils/import-row-readiness';
import type { ImportReviewRow } from '@ploutizo/types';
import { setImportDraftSelection } from './setImportDraftSelection';

const rowIdsWhere = (
  rows: readonly ImportReviewRow[],
  predicate: (row: ImportReviewRow) => boolean
) => rows.filter(predicate).map((row) => row.id);

/** Review entry / back from Finalize: check ready rows, clear others. */
export const applyImportReviewEntrySelection = (
  draftId: string,
  rows: readonly ImportReviewRow[]
) => {
  const selectedNotReady = rowIdsWhere(
    rows,
    (row) => row.selectedForImport && !isImportRowSelectable(row)
  );
  const readyUnchecked = rowIdsWhere(
    rows,
    (row) => isImportRowSelectable(row) && !row.selectedForImport
  );

  if (selectedNotReady.length > 0) {
    setImportDraftSelection(draftId, selectedNotReady, false);
  }
  if (readyUnchecked.length > 0) {
    setImportDraftSelection(draftId, readyUnchecked, true);
  }
};

export const syncImportReviewSelectionOnStatusChange = ({
  draftId,
  rows,
  previousStatusById,
  autoCheckImportRowWhenReady,
}: {
  draftId: string;
  rows: readonly ImportReviewRow[];
  previousStatusById: ReadonlyMap<string, ImportReviewRow['status']>;
  autoCheckImportRowWhenReady: boolean;
}) => {
  const toUncheck: string[] = [];
  const toCheck: string[] = [];

  for (const row of rows) {
    const previous = previousStatusById.get(row.id);
    if (previous === undefined) continue;

    const wasReady = previous === 'ready';
    const isReady = row.status === 'ready';

    if (wasReady && !isReady && row.selectedForImport) {
      toUncheck.push(row.id);
    }
    if (
      autoCheckImportRowWhenReady &&
      !wasReady &&
      isReady &&
      !row.selectedForImport
    ) {
      toCheck.push(row.id);
    }
  }

  if (toUncheck.length > 0) {
    setImportDraftSelection(draftId, toUncheck, false);
  }
  if (toCheck.length > 0) {
    setImportDraftSelection(draftId, toCheck, true);
  }
};
