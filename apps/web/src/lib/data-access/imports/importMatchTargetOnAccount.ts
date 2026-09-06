import { isImportMatchTargetOnAccount } from '@ploutizo/utils';
import type { ImportDraft } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { queryClient } from '@/lib/queryClient';
import { importDraftQueryKey } from './queryKeys';

/** Persist only match IDs that belong to the draft destination account. */
export const importMatchTransactionIdForDraft = (
  draftId: string,
  transactionId: string | null
): string | null => {
  if (!transactionId) return null;
  const draft = queryClient.getQueryData<ImportDraft>(
    importDraftQueryKey(draftId)
  );
  if (!draft?.account.id) return null;
  return isImportMatchTargetOnAccount(
    draft.matchTargetFacts[transactionId],
    draft.account.id
  )
    ? transactionId
    : null;
};

export const sanitizeImportMatchPatch = (
  draftId: string,
  patch: UpdateImportDraftRowInput
): UpdateImportDraftRowInput => {
  if (
    !Object.prototype.hasOwnProperty.call(patch, 'reviewMatchedTransactionId')
  ) {
    return patch;
  }
  const requested = patch.reviewMatchedTransactionId ?? null;
  const allowed = importMatchTransactionIdForDraft(draftId, requested);
  if (requested === allowed) return patch;
  const next = { ...patch };
  delete next.reviewMatchedTransactionId;
  return next;
};
