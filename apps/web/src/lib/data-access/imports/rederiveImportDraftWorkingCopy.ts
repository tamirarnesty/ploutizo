import { evaluateImportDraft } from '@ploutizo/utils';
import type {
  ExistingRefundTargetExpense,
  ImportDraftRowEvaluation,
} from '@ploutizo/utils';
import type {
  ImportDraft,
  ImportDraftRow,
  RefundTargetFact,
} from '@ploutizo/types';
import { queryClient } from '@/lib/queryClient';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { importDraftQueryKey } from './queryKeys';

export const refundTargetFactsToExpenseMap = (
  facts: Record<string, RefundTargetFact>
): Map<string, ExistingRefundTargetExpense> => {
  const map = new Map<string, ExistingRefundTargetExpense>();
  for (const [id, fact] of Object.entries(facts)) {
    map.set(id, fact);
  }
  return map;
};

/** Shared evaluator over working-copy rows + session facts. */
export const evaluateImportDraftWorkingCopy = (
  draftId: string,
  rows?: readonly ImportDraftRow[]
): Map<string, ImportDraftRowEvaluation> | null => {
  const draft = queryClient.getQueryData<ImportDraft>(
    importDraftQueryKey(draftId)
  );
  if (!draft?.account.id) return null;

  const collection = getImportDraftRowsCollection(draftId);
  const workingRows = rows ?? collection.toArray;
  if (workingRows.length === 0) return null;

  return evaluateImportDraft(workingRows, {
    targetAccountId: draft.account.id,
    existingExpenses: refundTargetFactsToExpenseMap(draft.refundTargetFacts),
  });
};

const applyEvaluationsToCollection = (
  draftId: string,
  evaluations: ReadonlyMap<string, ImportDraftRowEvaluation>,
  skipIds?: ReadonlySet<string>
) => {
  const collection = getImportDraftRowsCollection(draftId);
  for (const row of collection.toArray) {
    if (skipIds?.has(row.id)) continue;
    const evaluation = evaluations.get(row.id);
    if (!evaluation) continue;
    if (
      row.status === evaluation.status &&
      row.invalidReason === evaluation.invalidReason
    ) {
      continue;
    }
    collection.utils.writeUpdate({
      ...row,
      status: evaluation.status,
      invalidReason: evaluation.invalidReason,
    });
  }
};

/**
 * Re-run the shared draft evaluator and write derived status onto collection
 * rows. Single client derivation path for icons / Continue.
 */
export const rederiveImportDraftWorkingCopy = (
  draftId: string,
  options?: {
    rows?: readonly ImportDraftRow[];
    skipIds?: ReadonlySet<string>;
  }
) => {
  const evaluations = evaluateImportDraftWorkingCopy(draftId, options?.rows);
  if (!evaluations) return;
  applyEvaluationsToCollection(draftId, evaluations, options?.skipIds);
};
