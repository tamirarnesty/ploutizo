import type {
  ImportDraft,
  ImportDraftRow,
  RefundTargetFact,
} from '@ploutizo/types';
import { queryClient } from '@/lib/queryClient';
import { importDraftQueryKey } from './queryKeys';

export interface MergeImportDraftRefundTargetFactsInput {
  merge?: Record<string, RefundTargetFact>;
  removeIds?: string[];
}

export const mergeImportDraftRefundTargetFacts = (
  draftId: string,
  update: MergeImportDraftRefundTargetFactsInput
) => {
  queryClient.setQueryData<ImportDraft>(
    importDraftQueryKey(draftId),
    (prev) => {
      if (!prev) return prev;
      const nextFacts = { ...prev.refundTargetFacts };
      for (const id of update.removeIds ?? []) {
        delete nextFacts[id];
      }
      Object.assign(nextFacts, update.merge ?? {});
      return { ...prev, refundTargetFacts: nextFacts };
    }
  );
};

/**
 * Ids to drop from the facts bag when a refund link is cleared or retargeted.
 * `previousRefundOf === undefined` means the patch did not touch the link.
 */
export const resolveRefundTargetFactRemovals = (
  previousRefundOf: string | null | undefined,
  nextRefundOf: string | null | undefined,
  rows: readonly Pick<ImportDraftRow, 'reviewRefundOf'>[]
): string[] => {
  if (previousRefundOf === undefined) return [];
  if (previousRefundOf === null || previousRefundOf === nextRefundOf) {
    return [];
  }
  const stillReferenced = rows.some(
    (row) => row.reviewRefundOf === previousRefundOf
  );
  return stillReferenced ? [] : [previousRefundOf];
};

/** Merge PATCH fact deltas and sibling-safe GC for cleared/retargeted links. */
export const applyImportDraftRefundTargetFactDelta = (
  draftId: string,
  input: {
    merge?: Record<string, RefundTargetFact>;
    previousRefundOf?: string | null;
    nextRefundOf?: string | null;
    rows: readonly Pick<ImportDraftRow, 'reviewRefundOf'>[];
  }
) => {
  const removeIds = resolveRefundTargetFactRemovals(
    input.previousRefundOf,
    input.nextRefundOf,
    input.rows
  );
  if (!input.merge && removeIds.length === 0) return;
  mergeImportDraftRefundTargetFacts(draftId, {
    merge: input.merge,
    removeIds,
  });
};
