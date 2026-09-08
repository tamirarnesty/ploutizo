import type {
  ImportTransactionType,
  ReviewedImportValues,
} from '@ploutizo/types';
import {
  importDescriptionsAreSimilar,
  normalizeImportMatchDescription,
} from './import-matches';
import { toImportTransactionType } from './import-row-status';
import { resolveReviewedImportValues } from './reviewed-import-values';

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
  sourceDescription?: string | null;
  parsedDescription?: string | null;
  reviewDescription?: string | null;
}

/** Normalize draft/API row shapes into the refund-link evaluation input. */
export const toImportRefundLinkDraftRow = (row: {
  id: string;
  reviewType: string | null;
  parsedType: string | null;
  reviewAmount: number | null;
  parsedAmount: number | null;
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: readonly string[] | null | undefined;
  reviewRefundOf: string | null;
  reviewRefundOfBatchRowId?: string | null;
  selectedForImport: boolean;
  sourceDescription?: string | null;
  parsedDescription?: string | null;
  reviewDescription?: string | null;
}): ImportRefundLinkDraftRow => ({
  id: row.id,
  reviewType: toImportTransactionType(row.reviewType),
  parsedType: toImportTransactionType(row.parsedType),
  reviewAmount: row.reviewAmount,
  parsedAmount: row.parsedAmount,
  reviewCategoryId: row.reviewCategoryId,
  reviewAssigneeMemberIds: row.reviewAssigneeMemberIds ?? [],
  reviewRefundOf: row.reviewRefundOf,
  reviewRefundOfBatchRowId: row.reviewRefundOfBatchRowId ?? null,
  selectedForImport: row.selectedForImport,
  sourceDescription: row.sourceDescription ?? null,
  parsedDescription: row.parsedDescription ?? null,
  reviewDescription: row.reviewDescription ?? null,
});

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

export const isImportRefundLinkBlocked = (
  evaluation: ImportRefundLinkEvaluation | undefined
): boolean => Boolean(evaluation?.linked && !evaluation.valid);

export interface EvaluateImportRefundLinksOptions {
  targetAccountId: string;
  /**
   * When omitted, existing-transaction link targets are not validated
   * (client optimistic path). When provided (including empty), missing ids
   * are invalid.
   */
  existingExpenses?: ReadonlyMap<string, ExistingRefundTargetExpense>;
  /**
   * Prior finalized refund totals per target key (`tx:${id}` or `row:${id}`).
   * Used at Continue to include cross-import cumulative caps.
   */
  priorRefundsByTarget?: ReadonlyMap<string, number>;
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
  target: ImportRefundLinkDraftRow,
  values: ReviewedImportValues
): boolean => {
  if (values.type !== 'expense') return false;
  if (!target.selectedForImport) return false;
  if (!values.categoryId) return false;
  if (values.assigneeMemberIds.length === 0) return false;
  return values.amount != null && values.amount > 0;
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
    const values = resolveReviewedImportValues(row);
    if (values.type !== 'refund' || !row.selectedForImport) continue;
    if (values.amount == null || values.amount <= 0) continue;

    const key = values.refundOf
      ? `tx:${values.refundOf}`
      : values.refundOfBatchRowId
        ? `row:${values.refundOfBatchRowId}`
        : null;
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + values.amount);
  }
  return totals;
};

export const evaluateImportRefundLink = (
  row: ImportRefundLinkDraftRow,
  draftRows: readonly ImportRefundLinkDraftRow[],
  options: EvaluateImportRefundLinksOptions,
  selectedRefundTotals?: ReadonlyMap<string, number>,
  draftRowsById?: ReadonlyMap<string, ImportRefundLinkDraftRow>
): ImportRefundLinkEvaluation => {
  const values = resolveReviewedImportValues(row);
  if (values.type !== 'refund') {
    return emptyEvaluation(false);
  }

  const hasExisting = Boolean(values.refundOf);
  const hasSameImport = Boolean(values.refundOfBatchRowId);
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

  if (hasExisting && values.refundOf) {
    targetKey = `tx:${values.refundOf}`;
    if (options.existingExpenses) {
      const expense = options.existingExpenses.get(values.refundOf);
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

  if (hasSameImport && values.refundOfBatchRowId) {
    targetKey = `row:${values.refundOfBatchRowId}`;
    if (values.refundOfBatchRowId === row.id) {
      issues.push('self_link');
    }
    const target =
      draftRowsById?.get(values.refundOfBatchRowId) ??
      draftRows.find((r) => r.id === values.refundOfBatchRowId);
    if (!target) {
      issues.push('missing_target');
    } else {
      const targetValues = resolveReviewedImportValues(target);
      if (targetValues.type !== 'expense') {
        issues.push('target_not_expense');
      }
      if (!target.selectedForImport) {
        issues.push('target_not_selected');
      }
      if (!isSameImportExpenseFinalizable(target, targetValues)) {
        issues.push('target_unfinalizable');
      }
      inheritedCategoryId = targetValues.categoryId;
      inheritedAssigneeMemberIds = [...targetValues.assigneeMemberIds];
      targetAmount = targetValues.amount;
    }
  }

  if (targetKey && targetAmount != null && row.selectedForImport) {
    const totals =
      selectedRefundTotals ?? sumSelectedRefundsByTarget(draftRows);
    const draftTotal = totals.get(targetKey) ?? 0;
    const priorTotal = options.priorRefundsByTarget?.get(targetKey) ?? 0;
    if (draftTotal + priorTotal > targetAmount) {
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
  const draftRowsById = new Map(draftRows.map((row) => [row.id, row]));
  const results = new Map<string, ImportRefundLinkEvaluation>();
  for (const row of draftRows) {
    results.set(
      row.id,
      evaluateImportRefundLink(row, draftRows, options, totals, draftRowsById)
    );
  }
  return results;
};

export interface ImportRefundSuggestionTarget {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  rawDescription: string | null;
  deleted: boolean;
}

export interface ImportRefundSuggestion {
  kind: 'existing' | 'same_import';
  transactionId: string | null;
  batchRowId: string | null;
  explanation: string;
}

const refundRowDescription = (
  row: {
    sourceDescription?: string | null;
    parsedDescription?: string | null;
  },
  resolvedDescription: string | null
): string =>
  normalizeImportMatchDescription(
    row.sourceDescription ?? row.parsedDescription ?? resolvedDescription
  );

/** Derived refund-link suggestion. Never writes the user's saved decision. */
export const suggestImportRefundLink = (
  row: ImportRefundLinkDraftRow,
  draftRows: readonly ImportRefundLinkDraftRow[],
  options: {
    targetAccountId: string;
    existingExpenses?: readonly ImportRefundSuggestionTarget[];
  }
): ImportRefundSuggestion | null => {
  const values = resolveReviewedImportValues(row);
  if (values.type !== 'refund') return null;

  if (values.amount == null || values.amount <= 0) return null;

  const description = refundRowDescription(row, values.description);
  if (!description) return null;

  const scored: {
    score: number;
    suggestion: ImportRefundSuggestion;
  }[] = [];

  for (const expense of options.existingExpenses ?? []) {
    if (expense.deleted) continue;
    if (expense.accountId !== options.targetAccountId) continue;
    if (expense.amount < values.amount) continue;
    const expenseDescription = normalizeImportMatchDescription(
      expense.rawDescription ?? expense.description
    );
    if (!importDescriptionsAreSimilar(description, expenseDescription)) {
      continue;
    }
    scored.push({
      score: expense.amount === values.amount ? 2 : 1,
      suggestion: {
        kind: 'existing',
        transactionId: expense.id,
        batchRowId: null,
        explanation:
          expense.amount === values.amount
            ? 'Suggested refund of an existing expense with the same amount.'
            : 'Suggested refund of an existing expense with a similar description.',
      },
    });
  }

  for (const target of draftRows) {
    if (target.id === row.id) continue;
    const targetValues = resolveReviewedImportValues(target);
    if (targetValues.type !== 'expense') continue;
    if (!target.selectedForImport) continue;
    if (targetValues.amount == null || targetValues.amount < values.amount) {
      continue;
    }
    const targetDescription = refundRowDescription(
      target,
      targetValues.description
    );
    if (!importDescriptionsAreSimilar(description, targetDescription)) {
      continue;
    }
    scored.push({
      score: targetValues.amount === values.amount ? 2 : 1,
      suggestion: {
        kind: 'same_import',
        transactionId: null,
        batchRowId: target.id,
        explanation:
          targetValues.amount === values.amount
            ? 'Suggested refund of a selected expense in this import.'
            : 'Suggested refund of a similar selected expense in this import.',
      },
    });
  }

  if (scored.length === 0) return null;
  scored.sort((left, right) => right.score - left.score);
  const best = scored[0];
  if (scored.filter((item) => item.score === best.score).length > 1) {
    return null;
  }
  return best.suggestion;
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
