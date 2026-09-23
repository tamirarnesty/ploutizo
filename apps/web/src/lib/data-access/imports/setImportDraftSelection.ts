import { matchDecisionsForSelectedRows } from '@ploutizo/utils';
import type { ImportDraft } from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { importMatchTransactionIdForDraft } from './importMatchTargetOnAccount';
import { importDraftQueryKey } from './queryKeys';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';

/** Session-only selection: writes the working copy and match decisions, never the API. */
export const setImportDraftSelection = (
  draftId: string,
  rowIds: string[],
  selectedForImport: boolean
) => {
  if (rowIds.length === 0) return;
  const importDraft = getActiveQueryClient().getQueryData<ImportDraft>(
    importDraftQueryKey(draftId)
  );
  if (!importDraft?.account.id) return;

  const collection = getImportDraftRowsCollection(draftId);
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

  for (const row of nextRows) {
    if (!rowIdSet.has(row.id)) continue;
    const decided = patches.get(row.id) ?? null;
    collection.utils.writeUpdate({
      ...row,
      reviewMatchedTransactionId: decided
        ? importMatchTransactionIdForDraft(draftId, decided)
        : null,
    });
  }
  rederiveImportDraftWorkingCopy(draftId);
};
