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
  suggestImportRefundLink,
  toImportRefundLinkDraftRow,
} from './import-refund-links';
import { evaluateImportMatches, toImportMatchDraftRow } from './import-matches';
import type { ImportRowReviewBlocker } from './import-row-status';
import type {
  EvaluateImportRefundLinksOptions,
  ExistingRefundTargetExpense,
  ImportRefundLinkDraftRow,
  ImportRefundLinkEvaluation,
  ImportRefundSuggestion,
  ImportRefundSuggestionTarget,
} from './import-refund-links';
import type {
  EvaluateImportMatchesOptions,
  ImportMatchDraftRow,
  ImportMatchEvaluation,
  ImportMatchTargetTransaction,
} from './import-matches';

/** Durable import draft row fields used for status derivation. */
export interface ImportDraftDurableRow {
  id: string;
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
  externalId?: string | null;
  sourceDescription?: string | null;
  reviewMatchedTransactionId: string | null;
  reviewMatchDismissed: boolean;
}

export interface ImportDraftEvaluationOptions extends Omit<
  EvaluateImportRefundLinksOptions,
  'draftRows'
> {
  existingTransactions?: readonly ImportMatchTargetTransaction[];
}

export interface ImportDraftEvaluationContext {
  targetAccountId: string;
  draftRows: readonly ImportRefundLinkDraftRow[];
  matchDraftRows: readonly ImportMatchDraftRow[];
  existingExpenses: ReadonlyMap<string, ExistingRefundTargetExpense>;
  existingTransactions: readonly ImportMatchTargetTransaction[];
  priorRefundsByTarget?: ReadonlyMap<string, number>;
}

export interface ImportDraftRowEvaluation {
  status: ImportRowStatus;
  blockers: ImportRowReviewBlocker[];
  invalidReason: string | null;
  refundLink: ImportRefundLinkEvaluation | null;
  refundSuggestion: ImportRefundSuggestion | null;
  match: ImportMatchEvaluation | null;
}

export const toImportDraftEvaluationContext = (
  rows: readonly ImportDraftDurableRow[],
  options: ImportDraftEvaluationOptions
): ImportDraftEvaluationContext => ({
  targetAccountId: options.targetAccountId,
  draftRows: rows.map((row) => toImportRefundLinkDraftRow(row)),
  matchDraftRows: rows.map((row) => toImportMatchDraftRow(row)),
  existingExpenses: options.existingExpenses ?? new Map(),
  existingTransactions: options.existingTransactions ?? [],
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

const buildMatchEvaluations = (
  ctx: ImportDraftEvaluationContext
): Map<string, ImportMatchEvaluation> =>
  evaluateImportMatches(ctx.matchDraftRows, {
    targetAccountId: ctx.targetAccountId,
    existingTransactions: ctx.existingTransactions,
  } satisfies EvaluateImportMatchesOptions);

const refundSuggestionTargets = (
  ctx: ImportDraftEvaluationContext
): ImportRefundSuggestionTarget[] =>
  ctx.existingTransactions
    .filter((transaction) => transaction.type === 'expense')
    .map((transaction) => ({
      id: transaction.id,
      accountId: transaction.accountId,
      amount: transaction.amount,
      description: transaction.description,
      rawDescription: transaction.rawDescription,
      deleted: transaction.deleted,
    }));

/** Derive presentation status for one import draft row. */
export const evaluateImportDraftRow = (
  row: ImportDraftDurableRow,
  ctx: ImportDraftEvaluationContext,
  refundEvaluations?: ReadonlyMap<string, ImportRefundLinkEvaluation>,
  matchEvaluations?: ReadonlyMap<string, ImportMatchEvaluation>
): ImportDraftRowEvaluation => {
  const evaluations = refundEvaluations ?? buildRefundLinkEvaluations(ctx);
  const matches = matchEvaluations ?? buildMatchEvaluations(ctx);
  const refundLink = evaluations.get(row.id) ?? null;
  const refundLinkBlocked = isImportRefundLinkBlocked(refundLink ?? undefined);
  const match = matches.get(row.id) ?? null;
  const refundSuggestion = suggestImportRefundLink(
    toImportRefundLinkDraftRow(row),
    ctx.draftRows,
    {
      targetAccountId: ctx.targetAccountId,
      existingExpenses: refundSuggestionTargets(ctx),
    }
  );

  const statusFields = toImportRowStatusFields({
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
    matchBlocked: Boolean(match?.matchNeedsReview),
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
    refundSuggestion,
    match,
  };
};

/** Derive presentation status for every row in a draft. */
export const evaluateImportDraft = (
  rows: readonly ImportDraftDurableRow[],
  options: ImportDraftEvaluationOptions & {
    draftRows?: readonly ImportRefundLinkDraftRow[];
  }
): Map<string, ImportDraftRowEvaluation> => {
  const ctx = toImportDraftEvaluationContext(rows, options);
  if (options.draftRows) {
    ctx.draftRows = options.draftRows;
  }
  const refundEvaluations = buildRefundLinkEvaluations(ctx);
  const matchEvaluations = buildMatchEvaluations(ctx);
  const results = new Map<string, ImportDraftRowEvaluation>();
  for (const row of rows) {
    results.set(
      row.id,
      evaluateImportDraftRow(row, ctx, refundEvaluations, matchEvaluations)
    );
  }
  return results;
};

export type ImportDraftRowView<T extends ImportDraftDurableRow> = T &
  Pick<ImportDraftRowEvaluation, 'status' | 'blockers' | 'invalidReason'> & {
    refundLink: ImportRefundLinkEvaluation | null;
    refundSuggestion: ImportRefundSuggestion | null;
    match: ImportMatchEvaluation | null;
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
  refundSuggestion: evaluation.refundSuggestion,
  match: evaluation.match,
});

export const buildImportDraftRowViews = <T extends ImportDraftDurableRow>(
  rows: readonly T[],
  options: ImportDraftEvaluationOptions & {
    draftRows?: readonly ImportRefundLinkDraftRow[];
  }
): ImportDraftRowView<T>[] => {
  const evaluations = evaluateImportDraft(rows, options);
  return rows.map((row) =>
    buildImportDraftRowView(row, evaluations.get(row.id)!)
  );
};
