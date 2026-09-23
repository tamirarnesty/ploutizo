import { evaluateImportDraft } from '@ploutizo/utils';
import type {
  ExistingRefundTargetExpense,
  ImportDraftDurableRow,
  ImportDraftRowEvaluation,
} from '@ploutizo/utils';
import type {
  ImportDraft,
  ImportReviewRow,
  RefundTargetFact,
} from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
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
  rows?: readonly ImportReviewRow[]
): Map<string, ImportDraftRowEvaluation> | null => {
  const draft = getActiveQueryClient().getQueryData<ImportDraft>(
    importDraftQueryKey(draftId)
  );
  if (!draft?.account.id) return null;

  const workingRows = rows ?? getImportDraftRowsCollection(draftId).toArray;
  if (workingRows.length === 0) return null;

  const durableRows: ImportDraftDurableRow[] = workingRows.map((row) => ({
    id: row.id,
    reviewDate: row.reviewDate,
    reviewAmount: row.reviewAmount,
    reviewType: row.reviewType,
    reviewDescription: row.reviewDescription,
    parsedDate: row.parsedDate,
    parsedAmount: row.parsedAmount,
    parsedType: row.parsedType,
    parsedDescription: row.parsedDescription,
    reviewCategoryId: row.reviewCategoryId,
    reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
    reviewCounterpartAccountId: row.reviewCounterpartAccountId,
    reviewRefundOf: row.reviewRefundOf,
    reviewRefundOfBatchRowId: row.reviewRefundOfBatchRowId,
    selectedForImport: row.selectedForImport,
    externalId: row.externalId,
    sourceDescription: row.sourceDescription,
    reviewMatchedTransactionId: row.reviewMatchedTransactionId,
    reviewMatchDismissed: row.reviewMatchDismissed,
  }));

  return evaluateImportDraft(durableRows, {
    targetAccountId: draft.account.id,
    existingExpenses: refundTargetFactsToExpenseMap(draft.refundTargetFacts),
    existingTransactions: Object.values(draft.matchTargetFacts),
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
 * Re-run the shared draft evaluator and write derived `status` /
 * `invalidReason` onto collection rows.
 *
 * Sole client status writer for review icons and Continue
 * (`canContinueImportReview` reads collection `status` only). Optimistic
 * paced patches may set status inline, then call this for siblings.
 */
export const rederiveImportDraftWorkingCopy = (
  draftId: string,
  options?: {
    rows?: readonly ImportReviewRow[];
    skipIds?: ReadonlySet<string>;
    evaluations?: Map<string, ImportDraftRowEvaluation> | null;
  }
) => {
  const evaluations =
    options && 'evaluations' in options
      ? options.evaluations
      : evaluateImportDraftWorkingCopy(draftId, options?.rows);
  if (!evaluations) return;
  applyEvaluationsToCollection(draftId, evaluations, options?.skipIds);
};
