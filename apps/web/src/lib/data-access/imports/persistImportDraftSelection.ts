import { matchDecisionsForSelectedRows } from '@ploutizo/utils';
import { createOptimisticAction } from '@tanstack/db';
import type { ImportDraft, ImportDraftPersistedRow } from '@ploutizo/types';
import type { UpdateImportDraftRowSelectionInput } from '@ploutizo/validators';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import { queryClient } from '@/lib/queryClient';
import {
  getImportReviewAutosaveSnapshot,
  markImportReviewSelectionFailure,
  markImportReviewSelectionStart,
  markImportReviewSelectionSuccess,
} from './importReviewAutosave';
import { fetchUpdateImportDraftRowSelection } from './fetchUpdateImportDraftRowSelection';
import { flushImportDraftRowPacedMutations } from './getImportDraftRowPacedMutations';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { importMatchTransactionIdForDraft } from './importMatchTargetOnAccount';
import { importDraftQueryKey } from './queryKeys';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';

interface SelectionVariables {
  access: ActiveHouseholdAccess;
  draftId: string;
  rowIds: string[];
  selectedForImport: boolean;
}

const applySelectionMatchDecisions = (
  access: ActiveHouseholdAccess,
  draftId: string,
  rowIds: string[],
  selectedForImport: boolean
) => {
  const importDraft = queryClient.getQueryData<ImportDraft>(
    importDraftQueryKey(access, draftId)
  );
  if (!importDraft?.account.id) return;

  const collection = getImportDraftRowsCollection(access, draftId);
  const rowIdSet = new Set(rowIds);
  const nextRows = collection.toArray.map((row) =>
    rowIdSet.has(row.id) ? { ...row, selectedForImport } : row
  );
  const patches = matchDecisionsForSelectedRows(nextRows, {
    rowIds,
    selectedForImport,
    targetAccountId: importDraft.account.id,
    existingTransactions: Object.values(importDraft.matchTargetFacts),
  });

  collection.update(rowIds, (drafts) => {
    for (const draft of drafts) {
      draft.selectedForImport = selectedForImport;
      const decided = patches.get(draft.id) ?? null;
      draft.reviewMatchedTransactionId = decided
        ? importMatchTransactionIdForDraft(access, draftId, decided)
        : null;
    }
  });
};

const confirmSelectionIntoCollection = (
  access: ActiveHouseholdAccess,
  draftId: string,
  serverRows: ImportDraftPersistedRow[] | null,
  rowIds: string[],
  selectedForImport: boolean
) => {
  const collection = getImportDraftRowsCollection(access, draftId);
  const serverById = serverRows
    ? new Map(serverRows.map((row) => [row.id, row]))
    : null;

  for (const rowId of rowIds) {
    const live = collection.get(rowId);
    if (!live) continue;

    const serverRow = serverById?.get(rowId);
    if (!serverRow) {
      collection.utils.writeUpdate(live);
      continue;
    }

    const nextSelected =
      live.selectedForImport !== selectedForImport
        ? live.selectedForImport
        : serverRow.selectedForImport;
    collection.utils.writeUpdate({
      ...live,
      selectedForImport: nextSelected,
      reviewMatchedTransactionId:
        live.selectedForImport !== selectedForImport
          ? live.reviewMatchedTransactionId
          : serverRow.reviewMatchedTransactionId,
      updatedAt:
        serverRow.updatedAt >= live.updatedAt
          ? serverRow.updatedAt
          : live.updatedAt,
    });
  }
  rederiveImportDraftWorkingCopy(access, draftId);
};

const persistSelection = createOptimisticAction<SelectionVariables>({
  onMutate: ({ access, draftId, rowIds, selectedForImport }) => {
    applySelectionMatchDecisions(access, draftId, rowIds, selectedForImport);
    rederiveImportDraftWorkingCopy(access, draftId);
  },
  mutationFn: async ({ access, draftId, rowIds, selectedForImport }) => {
    markImportReviewSelectionStart(draftId);
    // Field persists first when ordering matters (ADR 0005).
    await flushImportDraftRowPacedMutations(access, draftId);

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
        access,
        draftId,
        serverRows,
        rowIds,
        selectedForImport
      );
      markImportReviewSelectionSuccess(draftId, rowIds);
    } catch {
      confirmSelectionIntoCollection(
        access,
        draftId,
        null,
        rowIds,
        selectedForImport
      );
      markImportReviewSelectionFailure(draftId, rowIds);
    }
  },
});

export const persistImportDraftSelection = (
  access: ActiveHouseholdAccess,
  draftId: string,
  rowIds: string[],
  selectedForImport: boolean
) => {
  if (rowIds.length === 0) return;
  persistSelection({ access, draftId, rowIds, selectedForImport });
};

/** Re-persist failed selection from the live working copy (not the original intent). */
export const retryFailedImportDraftSelection = (
  access: ActiveHouseholdAccess,
  draftId: string
) => {
  const { failedSelectionRowIds } = getImportReviewAutosaveSnapshot(draftId);
  if (failedSelectionRowIds.length === 0) return;

  const collection = getImportDraftRowsCollection(access, draftId);
  const byValue = new Map<boolean, string[]>();
  for (const rowId of failedSelectionRowIds) {
    const live = collection.get(rowId);
    if (!live) continue;
    const group = byValue.get(live.selectedForImport) ?? [];
    group.push(rowId);
    byValue.set(live.selectedForImport, group);
  }

  for (const [selectedForImport, rowIds] of byValue) {
    persistImportDraftSelection(access, draftId, rowIds, selectedForImport);
  }
};
