import {
  computeImportDraftRowCounts,
  evaluateImportDraft,
} from '@ploutizo/utils';
import { toImportTransactionType } from '@ploutizo/utils/import-row-status';
import type {
  ImportDraftDurableRow,
  ImportDraftRowEvaluation,
} from '@ploutizo/utils';
import type { ImportDraft, ImportDraftRow } from '@ploutizo/types';
import type {
  ImportDraftRowRecord,
  ImportDraftSummaryRow,
} from '@/lib/queries/imports';
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';

const collectRefundOfIds = (
  rows: readonly Pick<ImportDraftRowRecord, 'reviewRefundOf'>[]
): string[] =>
  rows.flatMap((row) => (row.reviewRefundOf ? [row.reviewRefundOf] : []));

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

export const toImportDraftRow = (
  row: ImportDraftRowRecord,
  evaluation: ImportDraftRowEvaluation
): ImportDraftRow => ({
  id: row.id,
  batchId: row.batchId,
  rowNumber: row.rowNumber,
  status: evaluation.status,
  invalidReason: evaluation.invalidReason,
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

const deriveImportDraftRowEvaluations = async (
  orgId: string,
  targetAccountId: string,
  rows: readonly ImportDraftRowRecord[]
) => {
  const existingExpenses = await listRefundTargetExpensesByIds(
    orgId,
    collectRefundOfIds(rows)
  );
  return evaluateImportDraft(
    rows.map((row) => toImportDraftDurableRow(row)),
    {
      targetAccountId,
      existingExpenses,
    }
  );
};

export const buildImportDraftRows = async (
  orgId: string,
  targetAccountId: string,
  rows: readonly ImportDraftRowRecord[]
): Promise<ImportDraftRow[]> => {
  const evaluations = await deriveImportDraftRowEvaluations(
    orgId,
    targetAccountId,
    rows
  );
  return rows.map((row) => toImportDraftRow(row, evaluations.get(row.id)!));
};

export const buildImportDraftView = async (
  orgId: string,
  summary: ImportDraftSummaryRow,
  rows: readonly ImportDraftRowRecord[],
  toSummary: (row: ImportDraftSummaryRow) => Omit<ImportDraft, 'rows'>
): Promise<ImportDraft> => {
  if (!summary.accountId) {
    throw new Error('Import draft is missing an account.');
  }

  const apiRows = await buildImportDraftRows(orgId, summary.accountId, rows);
  const counts = computeImportDraftRowCounts(apiRows);

  return {
    ...toSummary(summary),
    rowCount: counts.rowCount,
    validRowCount: counts.validRowCount,
    invalidRowCount: counts.invalidRowCount,
    rows: apiRows,
  };
};
