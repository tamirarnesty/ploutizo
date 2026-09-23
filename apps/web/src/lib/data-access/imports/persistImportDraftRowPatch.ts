import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { WorkingSetScope } from '@/lib/access/working-set-registry';
import { fetchUpdateImportDraftRow } from './fetchUpdateImportDraftRow';
import { confirmPersistIntoCollection } from './importDraftRowPersistConfirm';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import {
  getImportReviewAutosaveSnapshot,
  markImportReviewPersistFailure,
  markImportReviewPersistStart,
  markImportReviewPersistSuccess,
} from './importReviewAutosave';
import { sanitizeImportMatchPatch } from './importMatchTargetOnAccount';
import { patchFromLiveKeys } from './importDraftRowOptimisticPatch';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';
import { runImportDraftPersist } from './runImportDraftPersist';

type PersistImportDraftRowPatchInput = {
  draftId: string;
  rowId: string;
  scope: WorkingSetScope;
  patch: UpdateImportDraftRowInput;
  attempted: ImportReviewRow;
  original: ImportReviewRow;
};

export const buildImportDraftRowPersistPatch = (
  draftId: string,
  rowId: string,
  live: ImportReviewRow,
  changedPatch: UpdateImportDraftRowInput | null
): UpdateImportDraftRowInput =>
  sanitizeImportMatchPatch(draftId, {
    ...(patchFromLiveKeys(
      live,
      getImportReviewAutosaveSnapshot(draftId).failedFieldKeys.get(rowId) ?? []
    ) ?? {}),
    ...(changedPatch ?? {}),
  } as UpdateImportDraftRowInput);

export const persistImportDraftRowPatch = async ({
  draftId,
  rowId,
  scope,
  patch,
  attempted,
  original,
}: PersistImportDraftRowPatchInput): Promise<boolean> => {
  const collection = getImportDraftRowsCollection(draftId);

  if (Object.keys(patch).length === 0) {
    collection.utils.writeUpdate(attempted);
    rederiveImportDraftWorkingCopy(draftId);
    markImportReviewPersistStart(draftId, rowId);
    markImportReviewPersistSuccess(draftId, rowId);
    return true;
  }

  const persistedKeys = Object.keys(patch);

  return runImportDraftPersist({
    scope,
    onStart: () => markImportReviewPersistStart(draftId, rowId),
    persist: () => fetchUpdateImportDraftRow(draftId, rowId, patch),
    onSuccess: (server) => {
      confirmPersistIntoCollection(
        collection,
        server,
        attempted,
        original,
        patch,
        draftId
      );
      markImportReviewPersistSuccess(draftId, rowId, persistedKeys);
    },
    onFailure: () => {
      confirmPersistIntoCollection(
        collection,
        null,
        attempted,
        original,
        patch,
        draftId
      );
      markImportReviewPersistFailure(draftId, rowId, persistedKeys);
    },
  });
};
