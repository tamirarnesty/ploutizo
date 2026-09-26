import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { buildDirtyRowPatchFromBaseline } from './importDraftPersistBaselines';
import { patchFromLiveKeys } from './importDraftRowOptimisticPatch';
import { sanitizeImportMatchPatch } from './importMatchTargetOnAccount';
import { getImportReviewAutosaveSnapshot } from './importReviewAutosave';

export const buildImportDraftRowPersistPatch = (
  draftId: string,
  rowId: string,
  live: ImportReviewRow,
  changedPatch: UpdateImportDraftRowInput | null
): UpdateImportDraftRowInput => {
  const failedKeys =
    getImportReviewAutosaveSnapshot(draftId).failedFieldKeys.get(rowId) ?? [];
  return sanitizeImportMatchPatch(draftId, {
    ...(buildDirtyRowPatchFromBaseline(live, draftId) ?? {}),
    ...(patchFromLiveKeys(live, failedKeys) ?? {}),
    ...(changedPatch ?? {}),
  } as UpdateImportDraftRowInput);
};
