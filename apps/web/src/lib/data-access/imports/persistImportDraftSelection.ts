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

  // Apply selection for toggled ids and status for every returned row so
  // same-import refund-link blockers stay in sync with Continue gating.
  for (const serverRow of serverRows) {
    const live = collection.get(serverRow.id);
    if (!live) {
      collection.utils.writeUpdate(serverRow);
      continue;
    }

    const wasToggled = rowIds.includes(serverRow.id);
    const nextSelected = wasToggled
      ? live.selectedForImport !== selectedForImport
        ? live.selectedForImport
        : serverRow.selectedForImport
      : live.selectedForImport;

    collection.utils.writeUpdate({
      ...live,
      selectedForImport: nextSelected,
      status: serverRow.status,
      invalidReason: serverRow.invalidReason,
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
