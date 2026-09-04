import {
  collectMatchedTransactionIds,
  computeImportDraftRowCounts,
  evaluateImportDraft,
  matchTargetFactsRecordFromMap,
} from '@ploutizo/utils';
import { toImportTransactionType } from '@ploutizo/utils/import-row-status';
import { db } from '@ploutizo/db';
import type { DbClient } from '@ploutizo/db';
import type {
  ExistingRefundTargetExpense,
  ImportDraftDurableRow,
  ImportDraftRowEvaluation,
} from '@ploutizo/utils';
import type {
  ImportDraft,
  ImportDraftPersistedRow,
  ImportDraftRow,
  RefundTargetFact,
} from '@ploutizo/types';
import type {
  ImportDraftRowRecord,
  ImportDraftSummaryRow,
} from '@/lib/queries/imports';
import {
  listRefundTargetExpensesByIds,
  sumPriorRefundTotalsByTransactionTarget,
} from '@/lib/queries/import-refund-targets';
import { listImportMatchTargets } from '@/lib/queries/import-match-targets';

const collectRefundOfIds = (
  rows: readonly Pick<ImportDraftRowRecord, 'reviewRefundOf'>[]
): string[] =>
  rows.flatMap((row) => (row.reviewRefundOf ? [row.reviewRefundOf] : []));

export const refundTargetFactsRecordFromMap = (
  map: ReadonlyMap<string, ExistingRefundTargetExpense>
): Record<string, RefundTargetFact> => {
  const record: Record<string, RefundTargetFact> = {};
  for (const [id, fact] of map) {
    record[id] = {
      id: fact.id,
      accountId: fact.accountId,
      amount: fact.amount,
      categoryId: fact.categoryId,
      assigneeMemberIds: [...fact.assigneeMemberIds],
      type: fact.type,
      deleted: fact.deleted,
    };
  }
  return record;
};

export const toImportDraftDurableRow = (
  row: ImportDraftRowRecord
): ImportDraftDurableRow => ({
  id: row.id,
  reviewDate: row.reviewDate ?? null,
  reviewAmount: row.reviewAmount,
  reviewType: row.reviewType,
  reviewDescription: row.reviewDescription,
  parsedDate: row.parsedDate ?? null,
  parsedAmount: row.parsedAmount,
  parsedType: row.parsedType,
  parsedDescription: row.parsedDescription,
  reviewCategoryId: row.reviewCategoryId,
  reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
  reviewCounterpartAccountId: row.reviewCounterpartAccountId,
  reviewRefundOf: row.reviewRefundOf,
  reviewRefundOfBatchRowId: undefined,
  selectedForImport: row.selectedForImport,
  externalId: row.externalId,
  sourceDescription: row.sourceDescription,
  reviewMatchedTransactionId: row.reviewMatchedTransactionId,
  reviewMatchDismissed: row.reviewMatchDismissed,
});

export const toImportDraftPersistedRow = (
  row: ImportDraftRowRecord
): ImportDraftPersistedRow => ({
  id: row.id,
  batchId: row.batchId,
  rowNumber: row.rowNumber,
  rawData: row.rawData,
  externalId: row.externalId,
  sourceDate: row.sourceDate,
  sourceAmount: row.sourceAmount,
  sourceDescription: row.sourceDescription,
  sourceType: row.sourceType,
  parsedDate: row.parsedDate ?? null,
  parsedAmount: row.parsedAmount,
  parsedType: toImportTransactionType(row.parsedType),
  parsedDescription: row.parsedDescription,
  reviewDate: row.reviewDate ?? null,
  reviewAmount: row.reviewAmount,
  reviewType: toImportTransactionType(row.reviewType),
  reviewDescription: row.reviewDescription,
  reviewCategoryId: row.reviewCategoryId,
  reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
  reviewCounterpartAccountId: row.reviewCounterpartAccountId,
  reviewRefundOf: row.reviewRefundOf,
  reviewRefundLinkHint: row.reviewRefundLinkHint,
  reviewMatchedTransactionId: row.reviewMatchedTransactionId,
  reviewMatchDismissed: row.reviewMatchDismissed,
  reviewNotes: row.reviewNotes,
  reviewTagIds: row.reviewTagIds,
  selectedForImport: row.selectedForImport,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toImportDraftRow = (
  row: ImportDraftRowRecord,
  evaluation: ImportDraftRowEvaluation
): ImportDraftRow => ({
  ...toImportDraftPersistedRow(row),
  // Same-import batch-row links are working-copy only until the DB column lands.
  reviewRefundOfBatchRowId: null,
  status: evaluation.status,
  invalidReason: evaluation.invalidReason,
});

export const loadDraftEvaluationContext = async (
  orgId: string,
  targetAccountId: string,
  rows: readonly ImportDraftRowRecord[],
  options?: {
    client?: DbClient;
    includePriorRefunds?: boolean;
  }
) => {
  const client = options?.client ?? db;
  const refundOfIds = collectRefundOfIds(rows);
  const matchedIds = collectMatchedTransactionIds(rows);
  const [existingExpenses, priorRefundsByTarget, existingTransactions] =
    await Promise.all([
      listRefundTargetExpensesByIds(orgId, refundOfIds, client),
      options?.includePriorRefunds
        ? sumPriorRefundTotalsByTransactionTarget(orgId, refundOfIds, client)
        : Promise.resolve(undefined),
      listImportMatchTargets(orgId, targetAccountId, matchedIds, client),
    ]);
  const evaluations = evaluateImportDraft(
    rows.map((row) => toImportDraftDurableRow(row)),
    {
      targetAccountId,
      existingExpenses,
      existingTransactions: [...existingTransactions.values()],
      ...(priorRefundsByTarget ? { priorRefundsByTarget } : {}),
    }
  );
  return {
    evaluations,
    refundTargetFacts: refundTargetFactsRecordFromMap(existingExpenses),
    matchTargetFacts: matchTargetFactsRecordFromMap(existingTransactions),
  };
};

export const deriveImportDraftReviewCounts = (
  evaluations: ReadonlyMap<string, ImportDraftRowEvaluation>
) =>
  computeImportDraftRowCounts(
    [...evaluations.values()].map((evaluation) => ({
      status: evaluation.status,
    }))
  );

export const withLiveImportReviewCounts = <
  T extends {
    rowCount: number;
    validRowCount: number;
    invalidRowCount: number;
  },
>(
  summary: T,
  evaluations: ReadonlyMap<string, ImportDraftRowEvaluation>
): T => {
  const counts = deriveImportDraftReviewCounts(evaluations);
  return {
    ...summary,
    validRowCount: counts.validRowCount,
    invalidRowCount: counts.invalidRowCount,
  };
};

export const buildImportDraftView = async (
  orgId: string,
  summary: ImportDraftSummaryRow,
  rows: readonly ImportDraftRowRecord[],
  toSummary: (
    row: ImportDraftSummaryRow
  ) => Omit<ImportDraft, 'rows' | 'refundTargetFacts' | 'matchTargetFacts'>
): Promise<ImportDraft> => {
  if (!summary.accountId) {
    throw new Error('Import draft is missing an account.');
  }

  const { evaluations, refundTargetFacts, matchTargetFacts } =
    await loadDraftEvaluationContext(orgId, summary.accountId, rows);
  const apiRows = rows.map((row) =>
    toImportDraftRow(row, evaluations.get(row.id)!)
  );
  const counts = deriveImportDraftReviewCounts(evaluations);

  return {
    ...toSummary(summary),
    rowCount: summary.rowCount,
    validRowCount: counts.validRowCount,
    invalidRowCount: counts.invalidRowCount,
    rows: apiRows,
    refundTargetFacts,
    matchTargetFacts,
  };
};
