import type { ImportRowStatus } from '@ploutizo/types';
import {
  evaluateImportRow,
  formatImportRowStructuralInvalidReason,
  toImportRowStatusFields,
  toImportTransactionType,
} from './import-row-status';
import {
  evaluateImportRefundLinks,
  isImportRefundLinkBlocked,
  toImportRefundLinkDraftRow,
} from './import-refund-links';
import type { ImportRowReviewBlocker } from './import-row-status';
import type {
  EvaluateImportRefundLinksOptions,
  ExistingRefundTargetExpense,
  ImportRefundLinkDraftRow,
  ImportRefundLinkEvaluation,
} from './import-refund-links';

/** Durable import draft row fields used for status derivation. */
export interface ImportDraftDurableRow {
  id: string;
  status: ImportRowStatus;
  reviewDate: string | null;
  reviewAmount: number | null;
  reviewType: string | null;
  reviewDescription: string | null;
  parsedDate: string | null;
  parsedAmount: number | null;
  parsedType: string | null;
  parsedDescription: string | null;
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: readonly string[];
  reviewCounterpartAccountId: string | null;
  reviewRefundOf: string | null;
  reviewRefundOfBatchRowId?: string | null;
  selectedForImport: boolean;
}

export interface ImportDraftEvaluationContext {
  targetAccountId: string;
  draftRows: readonly ImportRefundLinkDraftRow[];
  existingExpenses: ReadonlyMap<string, ExistingRefundTargetExpense>;
  priorRefundsByTarget?: ReadonlyMap<string, number>;
}

export interface ImportDraftRowEvaluation {
  status: ImportRowStatus;
  blockers: ImportRowReviewBlocker[];
  invalidReason: string | null;
  refundLink: ImportRefundLinkEvaluation | null;
}

export const toImportDraftEvaluationContext = (
  rows: readonly ImportDraftDurableRow[],
  options: Omit<EvaluateImportRefundLinksOptions, 'draftRows'>
): ImportDraftEvaluationContext => ({
  targetAccountId: options.targetAccountId,
  draftRows: rows.map((row) => toImportRefundLinkDraftRow(row)),
  existingExpenses: options.existingExpenses ?? new Map(),
  priorRefundsByTarget: options.priorRefundsByTarget,
});

const buildRefundLinkEvaluations = (
  ctx: ImportDraftEvaluationContext
): Map<string, ImportRefundLinkEvaluation> =>
  evaluateImportRefundLinks(ctx.draftRows, {
    targetAccountId: ctx.targetAccountId,
    existingExpenses: ctx.existingExpenses,
    priorRefundsByTarget: ctx.priorRefundsByTarget,
  });

/** Derive presentation status for one import draft row. */
export const evaluateImportDraftRow = (
  row: ImportDraftDurableRow,
  ctx: ImportDraftEvaluationContext,
  refundEvaluations?: ReadonlyMap<string, ImportRefundLinkEvaluation>
): ImportDraftRowEvaluation => {
  const evaluations = refundEvaluations ?? buildRefundLinkEvaluations(ctx);
  const refundLink = evaluations.get(row.id) ?? null;
  const refundLinkBlocked = isImportRefundLinkBlocked(refundLink ?? undefined);

  const statusFields = toImportRowStatusFields({
    status: row.status,
    reviewDate: row.reviewDate,
    reviewAmount: row.reviewAmount,
    reviewType: toImportTransactionType(row.reviewType),
    reviewDescription: row.reviewDescription,
    parsedDate: row.parsedDate,
    parsedAmount: row.parsedAmount,
    parsedType: toImportTransactionType(row.parsedType),
    parsedDescription: row.parsedDescription,
    reviewCategoryId: row.reviewCategoryId,
    reviewAssigneeMemberIds: [...row.reviewAssigneeMemberIds],
    reviewCounterpartAccountId: row.reviewCounterpartAccountId,
    refundLinkBlocked,
  });

  const evaluation = evaluateImportRow(statusFields);
  const invalidReason =
    evaluation.status === 'invalid'
      ? formatImportRowStructuralInvalidReason(statusFields)
      : null;

  return {
    status: evaluation.status,
    blockers: evaluation.blockers,
    invalidReason,
    refundLink: refundLink?.linked ? refundLink : null,
  };
};

/** Derive presentation status for every row in a draft. */
export const evaluateImportDraft = (
  rows: readonly ImportDraftDurableRow[],
  options: Omit<EvaluateImportRefundLinksOptions, 'draftRows'> & {
    draftRows?: readonly ImportRefundLinkDraftRow[];
  }
): Map<string, ImportDraftRowEvaluation> => {
  const ctx = toImportDraftEvaluationContext(rows, options);
  if (options.draftRows) {
    ctx.draftRows = options.draftRows;
  }
  const refundEvaluations = buildRefundLinkEvaluations(ctx);
  const results = new Map<string, ImportDraftRowEvaluation>();
  for (const row of rows) {
    results.set(row.id, evaluateImportDraftRow(row, ctx, refundEvaluations));
  }
  return results;
};

export type ImportDraftRowView<T extends ImportDraftDurableRow> = T &
  Pick<ImportDraftRowEvaluation, 'status' | 'blockers' | 'invalidReason'> & {
    refundLink: ImportRefundLinkEvaluation | null;
  };

/** Merge durable row fields with derived evaluation for API responses. */
export const buildImportDraftRowView = <T extends ImportDraftDurableRow>(
  row: T,
  evaluation: ImportDraftRowEvaluation
): ImportDraftRowView<T> => ({
  ...row,
  status: evaluation.status,
  blockers: evaluation.blockers,
  invalidReason: evaluation.invalidReason,
  refundLink: evaluation.refundLink,
});

export const buildImportDraftRowViews = <T extends ImportDraftDurableRow>(
  rows: readonly T[],
  options: Omit<EvaluateImportRefundLinksOptions, 'draftRows'> & {
    draftRows?: readonly ImportRefundLinkDraftRow[];
  }
): ImportDraftRowView<T>[] => {
  const evaluations = evaluateImportDraft(rows, options);
  return rows.map((row) =>
    buildImportDraftRowView(row, evaluations.get(row.id)!)
  );
};
