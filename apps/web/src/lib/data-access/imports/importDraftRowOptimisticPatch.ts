import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import {
  evaluateImportDraftWorkingCopy,
  rederiveImportDraftWorkingCopy,
} from './rederiveImportDraftWorkingCopy';

export const REVIEW_PATCH_KEYS = [
  'reviewDate',
  'reviewAmount',
  'reviewType',
  'reviewDescription',
  'reviewCategoryId',
  'reviewAssigneeMemberIds',
  'reviewCounterpartAccountId',
  'reviewRefundOf',
  'reviewRefundOfBatchRowId',
  'reviewRefundLinkHint',
  'reviewMatchedTransactionId',
  'reviewMatchDismissed',
  'reviewNotes',
  'reviewTagIds',
] as const satisfies readonly (keyof UpdateImportDraftRowInput)[];

export const toValidatorPatch = (
  changes: Partial<ImportDraftRow>
): UpdateImportDraftRowInput | null => {
  const patch: Record<string, unknown> = {};
  for (const key of REVIEW_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      patch[key] = changes[key];
    }
  }
  return Object.keys(patch).length > 0
    ? (patch as UpdateImportDraftRowInput)
    : null;
};

export const patchFromLiveKeys = (
  live: ImportDraftRow,
  keys: string[]
): UpdateImportDraftRowInput | null => {
  const changes: Record<string, unknown> = {};
  for (const key of keys) {
    if ((REVIEW_PATCH_KEYS as readonly string[]).includes(key)) {
      changes[key] = live[key as keyof ImportDraftRow];
    }
  }
  return toValidatorPatch(changes as Partial<ImportDraftRow>);
};

export const applyOptimisticRowPatch = (
  draftId: string,
  rowId: string,
  patch: UpdateImportDraftRowInput
) => {
  const collection = getImportDraftRowsCollection(draftId);
  const rowsForEval = collection.toArray.map((row) =>
    row.id === rowId ? { ...row, ...patch } : row
  );
  const evaluations = evaluateImportDraftWorkingCopy(draftId, rowsForEval);

  collection.update(rowId, (draft) => {
    Object.assign(draft, patch);
    const evaluation = evaluations?.get(rowId);
    if (!evaluation) return;
    draft.status = evaluation.status;
    draft.invalidReason = evaluation.invalidReason;
  });

  if (evaluations) {
    rederiveImportDraftWorkingCopy(draftId, {
      evaluations,
      skipIds: new Set([rowId]),
    });
  }
};
