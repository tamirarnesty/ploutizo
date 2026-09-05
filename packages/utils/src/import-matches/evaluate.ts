import type { MatchTargetFact } from '@ploutizo/types';
import { classifyAgainstTransaction, isExactImportMatchKind } from './classify';
import { collisionGroups, hasUnresolvedCollisionIssue } from './collisions';
import { savedDecisionIssues } from './decisions';
import type {
  ImportMatchDraftRow,
  ImportMatchEvaluation,
  ImportMatchIssue,
} from './types';

export interface EvaluateImportMatchesOptions {
  targetAccountId: string;
  existingTransactions: readonly MatchTargetFact[];
}

/** Derive match candidates, collisions, and accepted-match decisions for a draft. */
export const evaluateImportMatches = (
  rows: readonly ImportMatchDraftRow[],
  options: EvaluateImportMatchesOptions
): Map<string, ImportMatchEvaluation> => {
  const collisions = collisionGroups(rows);
  const transactionsById = new Map(
    options.existingTransactions.map((transaction) => [
      transaction.id,
      transaction,
    ])
  );
  const selectedIds = new Set(
    rows.filter((row) => row.selectedForImport).map((row) => row.id)
  );
  const results = new Map<string, ImportMatchEvaluation>();

  for (const row of rows) {
    const classified = options.existingTransactions.flatMap((transaction) => {
      const match = classifyAgainstTransaction(
        row,
        transaction,
        options.targetAccountId
      );
      return match ? [match] : [];
    });

    const exactMatches = classified.filter((item) =>
      isExactImportMatchKind(item.kind)
    );
    const advisoryCandidates = classified.filter(
      (item) => !isExactImportMatchKind(item.kind)
    );
    const exactCandidate =
      exactMatches.length === 1 ? (exactMatches[0] ?? null) : null;
    const collisionRowIds = collisions.get(row.id) ?? [];
    const issues: ImportMatchIssue[] = [];

    if (exactMatches.length > 1) {
      issues.push('ambiguous_exact');
    }

    const decision = savedDecisionIssues(
      row,
      options.targetAccountId,
      transactionsById,
      classified
    );
    issues.push(...decision.issues);

    if (
      hasUnresolvedCollisionIssue(
        collisionRowIds,
        selectedIds,
        row.selectedForImport
      )
    ) {
      issues.push('collision');
    }

    if (
      !row.reviewMatchDismissed &&
      !row.reviewMatchedTransactionId &&
      advisoryCandidates.length > 0 &&
      exactCandidate === null
    ) {
      issues.push('advisory_unresolved');
    }

    const savedCandidate = classified.find(
      (item) => item.transactionId === row.reviewMatchedTransactionId
    );
    const acceptedMatch =
      row.selectedForImport && decision.acceptedMatchValid && savedCandidate
        ? {
            transactionId: savedCandidate.transactionId,
            kind: savedCandidate.kind,
          }
        : null;

    results.set(row.id, {
      candidates: classified,
      exactCandidate,
      advisoryCandidates,
      collisionRowIds,
      acceptedMatch,
      acceptedMatchValid: decision.acceptedMatchValid,
      issues,
    });
  }

  return results;
};
