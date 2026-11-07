import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { buildDirtyRowPatchFromBaseline } from './importDraftPersistBaselines';
import { patchFromLiveKeys } from './importDraftRowOptimisticPatch';
import { sanitizeImportMatchPatch } from './importMatchTargetOnAccount';
import type { PersistBaselines } from './importDraftPersistBaselines';

/** Dirty diff against the baseline, plus earlier failed fields, plus the edit itself. */
export const buildImportDraftRowPersistPatch = ({
  draftId,
  baselines,
  failedKeys,
  live,
  changedPatch,
}: {
  draftId: string;
  baselines: PersistBaselines;
  failedKeys: readonly string[];
  live: ImportReviewRow;
  changedPatch: UpdateImportDraftRowInput | null;
}): UpdateImportDraftRowInput =>
  sanitizeImportMatchPatch(draftId, {
    ...(buildDirtyRowPatchFromBaseline(baselines, live) ?? {}),
    ...(patchFromLiveKeys(live, failedKeys) ?? {}),
    ...(changedPatch ?? {}),
  } as UpdateImportDraftRowInput);
