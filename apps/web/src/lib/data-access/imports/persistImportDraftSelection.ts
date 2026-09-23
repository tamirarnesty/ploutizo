import { matchDecisionsForSelectedRows } from '@ploutizo/utils';
import { createOptimisticAction } from '@tanstack/db';
import type { ImportDraft } from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import {
  markImportReviewSelectionFailure,
  markImportReviewSelectionSuccess,
} from './importReviewAutosave';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { importMatchTransactionIdForDraft } from './importMatchTargetOnAccount';
import { importDraftQueryKey } from './queryKeys';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';

interface SelectionVariables {
  draftId: string;
  rowIds: string[];
  selectedForImport: boolean;
}

const applySelectionMatchDecisions = (
  draftId: string,
  rowIds: string[],
  selectedForImport: boolean
) => {
  const importDraft = getActiveQueryClient().getQueryData<ImportDraft>(
    importDraftQueryKey(draftId)
  );
  if (!importDraft?.account.id) return;

  const collection = getImportDraftRowsCollection(draftId);
  const rowIdSet = new Set(rowIds);
  const nextRows = collection.toArray.map((row) =>
    rowIdSet.has(row.id)
      ? { ...row, selectedForImport: selectedForImport }
      : { ...row, selectedForImport: row.selectedForImport ?? false }
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
        ? importMatchTransactionIdForDraft(draftId, decided)
        : null;
    }
  });
};

const persistSelection = createOptimisticAction<SelectionVariables>({
  onMutate: ({ draftId, rowIds, selectedForImport }) => {
    applySelectionMatchDecisions(draftId, rowIds, selectedForImport);
    rederiveImportDraftWorkingCopy(draftId);
  },
  mutationFn: async ({ draftId, rowIds }) => {
    try {
      markImportReviewSelectionSuccess(draftId, rowIds);
    } catch {
      markImportReviewSelectionFailure(draftId, rowIds);
      rederiveImportDraftWorkingCopy(draftId);
      throw new Error('Selection update failed.');
    }
  },
});

export const persistImportDraftSelection = (
  draftId: string,
  rowIds: string[],
  selectedForImport: boolean
) => {
  if (rowIds.length === 0) return;
  void persistSelection({ draftId, rowIds, selectedForImport });
};

/** Re-apply failed selection from the live working copy (session-only). */
export const retryFailedImportDraftSelection = (draftId: string) => {
  const collection = getImportDraftRowsCollection(draftId);
  for (const row of collection.toArray) {
    if (row.selectedForImport == null) continue;
    persistImportDraftSelection(draftId, [row.id], row.selectedForImport);
  }
};
