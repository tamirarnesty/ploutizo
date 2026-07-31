import {
  computeImportDraftRowCounts,
  evaluateImportDraft,
} from '@ploutizo/utils';
import { toImportTransactionType } from '@ploutizo/utils/import-row-status';
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
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';

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
  status: row.status,
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
  selectedForImport: row.selectedForImport,
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
  status: evaluation.status,
  invalidReason: evaluation.invalidReason,
});

const loadDraftRefundContext = async (
  orgId: string,
  targetAccountId: string,
  rows: readonly ImportDraftRowRecord[]
) => {
  const existingExpenses = await listRefundTargetExpensesByIds(
    orgId,
    collectRefundOfIds(rows)
  );
  const evaluations = evaluateImportDraft(
    rows.map((row) => toImportDraftDurableRow(row)),
    {
      targetAccountId,
      existingExpenses,
    }
  );
  return {
    evaluations,
    refundTargetFacts: refundTargetFactsRecordFromMap(existingExpenses),
  };
};

export const buildImportDraftView = async (
  orgId: string,
  summary: ImportDraftSummaryRow,
  rows: readonly ImportDraftRowRecord[],
  toSummary: (
    row: ImportDraftSummaryRow
  ) => Omit<ImportDraft, 'rows' | 'refundTargetFacts'>
): Promise<ImportDraft> => {
  if (!summary.accountId) {
    throw new Error('Import draft is missing an account.');
  }

  const { evaluations, refundTargetFacts } = await loadDraftRefundContext(
    orgId,
    summary.accountId,
    rows
  );
  const apiRows = rows.map((row) =>
    toImportDraftRow(row, evaluations.get(row.id)!)
  );
  const counts = computeImportDraftRowCounts(apiRows);

  return {
    ...toSummary(summary),
    rowCount: counts.rowCount,
    validRowCount: counts.validRowCount,
    invalidRowCount: counts.invalidRowCount,
    rows: apiRows,
    refundTargetFacts,
  };
};
