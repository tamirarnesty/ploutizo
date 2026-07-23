import { createOptimisticAction } from '@tanstack/db';
import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowSelectionInput } from '@ploutizo/validators';
import {
  getImportReviewAutosaveSnapshot,
  markImportReviewSelectionFailure,
  markImportReviewSelectionStart,
  markImportReviewSelectionSuccess,
} from './importReviewAutosave';
import { fetchUpdateImportDraftRowSelection } from './fetchUpdateImportDraftRowSelection';
import { flushImportDraftRowPacedMutations } from './getImportDraftRowPacedMutations';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';

interface SelectionVariables {
  draftId: string;
  rowIds: string[];
  selectedForImport: boolean;
}

const confirmSelectionIntoCollection = (
  draftId: string,
  serverRows: ImportDraftRow[] | null,
  rowIds: string[],
  selectedForImport: boolean
) => {
  const collection = getImportDraftRowsCollection(draftId);

  if (!serverRows) {
    for (const rowId of rowIds) {
      const live = collection.get(rowId);
      if (live) collection.utils.writeUpdate(live);
    }
    return;
  }

  const serverById = new Map(serverRows.map((row) => [row.id, row]));
  for (const rowId of rowIds) {
    const live = collection.get(rowId);
    const serverRow = serverById.get(rowId);
    if (!live) {
      if (serverRow) collection.utils.writeUpdate(serverRow);
      continue;
    }
    if (!serverRow) {
      collection.utils.writeUpdate(live);
      continue;
    }
    // Prefer a newer local selection toggle over this response.
    const nextSelected =
      live.selectedForImport !== selectedForImport
        ? live.selectedForImport
        : serverRow.selectedForImport;
    collection.utils.writeUpdate({
      ...live,
      selectedForImport: nextSelected,
      updatedAt:
        serverRow.updatedAt >= live.updatedAt
          ? serverRow.updatedAt
          : live.updatedAt,
    });
  }
};

const persistSelection = createOptimisticAction<SelectionVariables>({
  onMutate: ({ draftId, rowIds, selectedForImport }) => {
    const collection = getImportDraftRowsCollection(draftId);
    collection.update(rowIds, (drafts) => {
      for (const draft of drafts) {
        draft.selectedForImport = selectedForImport;
      }
    });
  },
  mutationFn: async ({ draftId, rowIds, selectedForImport }) => {
    markImportReviewSelectionStart(draftId);
    // Field persists first when ordering matters (ADR 0005).
    await flushImportDraftRowPacedMutations(draftId);

    const body: UpdateImportDraftRowSelectionInput = {
      rowIds,
      selectedForImport,
    };

    try {
      const serverRows = await fetchUpdateImportDraftRowSelection(
        draftId,
        body
      );
      confirmSelectionIntoCollection(
        draftId,
        serverRows,
        rowIds,
        selectedForImport
      );
      markImportReviewSelectionSuccess(draftId, rowIds);
    } catch {
      confirmSelectionIntoCollection(draftId, null, rowIds, selectedForImport);
      markImportReviewSelectionFailure(draftId, rowIds);
    }
  },
});

export const persistImportDraftSelection = (
  draftId: string,
  rowIds: string[],
  selectedForImport: boolean
) => {
  if (rowIds.length === 0) return;
  persistSelection({ draftId, rowIds, selectedForImport });
};

/** Re-persist failed selection from the live working copy (not the original intent). */
export const retryFailedImportDraftSelection = (draftId: string) => {
  const { failedSelectionRowIds } = getImportReviewAutosaveSnapshot(draftId);
  if (failedSelectionRowIds.length === 0) return;

  const collection = getImportDraftRowsCollection(draftId);
  const byValue = new Map<boolean, string[]>();
  for (const rowId of failedSelectionRowIds) {
    const live = collection.get(rowId);
    if (!live) continue;
    const group = byValue.get(live.selectedForImport) ?? [];
    group.push(rowId);
    byValue.set(live.selectedForImport, group);
  }

  for (const [selectedForImport, rowIds] of byValue) {
    persistImportDraftSelection(draftId, rowIds, selectedForImport);
  }
};
