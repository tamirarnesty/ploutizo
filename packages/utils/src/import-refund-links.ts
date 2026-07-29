import type { ImportTransactionType } from '@ploutizo/types';
import {
  resolveImportRowReviewAmount,
  resolveImportRowReviewType,
  toImportTransactionType,
} from './import-row-status';

export interface ImportRefundLinkDraftRow {
  id: string;
  reviewType: ImportTransactionType | null;
  parsedType: ImportTransactionType | null;
  reviewAmount: number | null;
  parsedAmount: number | null;
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: readonly string[];
  reviewRefundOf: string | null;
  reviewRefundOfBatchRowId: string | null;
  selectedForImport: boolean;
}

export interface ExistingRefundTargetExpense {
  id: string;
  accountId: string;
  amount: number;
  categoryId: string | null;
  assigneeMemberIds: readonly string[];
  type: string;
  /** Soft-deleted expenses are not finalizable refund targets. */
  deleted: boolean;
}

export type ImportRefundLinkIssue =
  | 'missing_target'
  | 'wrong_account'
  | 'deleted_target'
  | 'not_expense'
  | 'target_not_selected'
  | 'target_not_expense'
  | 'target_unfinalizable'
  | 'cumulative_exceeds'
  | 'self_link'
  | 'dual_link';

export interface ImportRefundLinkEvaluation {
  /** Row has an explicit refund link (existing or same-import). */
  linked: boolean;
  valid: boolean;
  issues: ImportRefundLinkIssue[];
  /** Category/assignees to inherit when the link is valid. */
  inheritedCategoryId: string | null;
  inheritedAssigneeMemberIds: string[];
}

export interface EvaluateImportRefundLinksOptions {
  targetAccountId: string;
  /**
   * When omitted, existing-transaction link targets are not validated
   * (client optimistic path). When provided (including empty), missing ids
   * are invalid.
   */
  existingExpenses?: ReadonlyMap<string, ExistingRefundTargetExpense>;
}

const emptyEvaluation = (
  linked: boolean,
  issues: ImportRefundLinkIssue[] = []
): ImportRefundLinkEvaluation => ({
  linked,
  valid: linked ? issues.length === 0 : true,
  issues,
  inheritedCategoryId: null,
  inheritedAssigneeMemberIds: [],
});

const isSameImportExpenseFinalizable = (
  target: ImportRefundLinkDraftRow
): boolean => {
  const type = resolveImportRowReviewType(target);
  if (type !== 'expense') return false;
  if (!target.selectedForImport) return false;
  if (!target.reviewCategoryId) return false;
  if (target.reviewAssigneeMemberIds.length === 0) return false;
  const amount = resolveImportRowReviewAmount(target);
  return amount != null && amount > 0;
};

/**
 * Cumulative selected refund amounts toward each target key.
 * Keys are `tx:${id}` or `row:${id}`.
 */
export const sumSelectedRefundsByTarget = (
  rows: readonly ImportRefundLinkDraftRow[]
): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const type = resolveImportRowReviewType({
      reviewType: toImportTransactionType(row.reviewType),
      parsedType: toImportTransactionType(row.parsedType),
    });
    if (type !== 'refund' || !row.selectedForImport) continue;
    const amount = resolveImportRowReviewAmount(row);
    if (amount == null || amount <= 0) continue;

    const key = row.reviewRefundOf
      ? `tx:${row.reviewRefundOf}`
      : row.reviewRefundOfBatchRowId
        ? `row:${row.reviewRefundOfBatchRowId}`
        : null;
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }
  return totals;
};

export const evaluateImportRefundLink = (
  row: ImportRefundLinkDraftRow,
  draftRows: readonly ImportRefundLinkDraftRow[],
  options: EvaluateImportRefundLinksOptions,
  selectedRefundTotals?: ReadonlyMap<string, number>
): ImportRefundLinkEvaluation => {
  const type = resolveImportRowReviewType({
    reviewType: toImportTransactionType(row.reviewType),
    parsedType: toImportTransactionType(row.parsedType),
  });
  if (type !== 'refund') {
    return emptyEvaluation(false);
  }

  const hasExisting = Boolean(row.reviewRefundOf);
  const hasSameImport = Boolean(row.reviewRefundOfBatchRowId);
  if (!hasExisting && !hasSameImport) {
    return emptyEvaluation(false);
  }

  const issues: ImportRefundLinkIssue[] = [];
  if (hasExisting && hasSameImport) {
    issues.push('dual_link');
  }

  let inheritedCategoryId: string | null = null;
  let inheritedAssigneeMemberIds: string[] = [];
  let targetAmount: number | null = null;
  let targetKey: string | null = null;

  if (hasExisting && row.reviewRefundOf) {
    targetKey = `tx:${row.reviewRefundOf}`;
    if (options.existingExpenses) {
      const expense = options.existingExpenses.get(row.reviewRefundOf);
      if (!expense) {
        issues.push('missing_target');
      } else {
        if (expense.type !== 'expense') issues.push('not_expense');
        if (expense.deleted) issues.push('deleted_target');
        if (expense.accountId !== options.targetAccountId) {
          issues.push('wrong_account');
        }
        inheritedCategoryId = expense.categoryId;
        inheritedAssigneeMemberIds = [...expense.assigneeMemberIds];
        targetAmount = expense.amount;
      }
    }
  }

  if (hasSameImport && row.reviewRefundOfBatchRowId) {
    targetKey = `row:${row.reviewRefundOfBatchRowId}`;
    if (row.reviewRefundOfBatchRowId === row.id) {
      issues.push('self_link');
    }
    const target = draftRows.find((r) => r.id === row.reviewRefundOfBatchRowId);
    if (!target) {
      issues.push('missing_target');
    } else {
      const targetType = resolveImportRowReviewType({
        reviewType: toImportTransactionType(target.reviewType),
        parsedType: toImportTransactionType(target.parsedType),
      });
      if (targetType !== 'expense') {
        issues.push('target_not_expense');
      }
      if (!target.selectedForImport) {
        issues.push('target_not_selected');
      }
      if (!isSameImportExpenseFinalizable(target)) {
        issues.push('target_unfinalizable');
      }
      inheritedCategoryId = target.reviewCategoryId;
      inheritedAssigneeMemberIds = [...target.reviewAssigneeMemberIds];
      targetAmount = resolveImportRowReviewAmount(target);
    }
  }

  if (targetKey && targetAmount != null && row.selectedForImport) {
    const totals =
      selectedRefundTotals ?? sumSelectedRefundsByTarget(draftRows);
    const cumulative = totals.get(targetKey) ?? 0;
    if (cumulative > targetAmount) {
      issues.push('cumulative_exceeds');
    }
  }

  return {
    linked: true,
    valid: issues.length === 0,
    issues,
    inheritedCategoryId,
    inheritedAssigneeMemberIds,
  };
};

/** Evaluate every draft row; non-refund / unlinked rows are valid. */
export const evaluateImportRefundLinks = (
  draftRows: readonly ImportRefundLinkDraftRow[],
  options: EvaluateImportRefundLinksOptions
): Map<string, ImportRefundLinkEvaluation> => {
  const totals = sumSelectedRefundsByTarget(draftRows);
  const results = new Map<string, ImportRefundLinkEvaluation>();
  for (const row of draftRows) {
    results.set(
      row.id,
      evaluateImportRefundLink(row, draftRows, options, totals)
    );
  }
  return results;
};

export const inheritRefundLinkFields = (
  evaluation: ImportRefundLinkEvaluation
): {
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: string[];
} | null => {
  if (!evaluation.linked || !evaluation.valid) return null;
  if (
    !evaluation.inheritedCategoryId &&
    evaluation.inheritedAssigneeMemberIds.length === 0
  ) {
    return null;
  }
  return {
    reviewCategoryId: evaluation.inheritedCategoryId,
    reviewAssigneeMemberIds: evaluation.inheritedAssigneeMemberIds,
  };
};
