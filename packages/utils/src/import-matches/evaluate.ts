import type { MatchTargetFact } from '@ploutizo/types';
import { toImportTransactionType } from '../import-coercion';
import {
  classifyAgainstTransaction,
  importMatchRowFacts,
  importMatchTransactionDescription,
  isExactImportMatchKind,
} from './classify';
import { collisionGroups } from './collisions';
import type {
  ImportMatchCandidate,
  ImportMatchDraftRow,
  ImportMatchEvaluation,
  ImportMatchIssue,
} from './types';

export interface EvaluateImportMatchesOptions {
  targetAccountId: string;
  existingTransactions: readonly MatchTargetFact[];
}

export type ImportMatchDraftRowSource = {
  id: string;
  externalId?: string | null;
  reviewDate: string | null;
  parsedDate: string | null;
  reviewAmount: number | null;
  parsedAmount: number | null;
  reviewType: string | null;
  parsedType: string | null;
  reviewDescription: string | null;
  parsedDescription: string | null;
  sourceDescription?: string | null;
  selectedForImport: boolean;
  reviewMatchedTransactionId: string | null;
  reviewMatchDismissed: boolean;
};

const toImportMatchDraftRow = (
  row: ImportMatchDraftRowSource
): ImportMatchDraftRow => ({
  id: row.id,
  externalId: row.externalId ?? null,
  reviewDate: row.reviewDate,
  parsedDate: row.parsedDate,
  reviewAmount: row.reviewAmount,
  parsedAmount: row.parsedAmount,
  reviewType: toImportTransactionType(row.reviewType),
  parsedType: toImportTransactionType(row.parsedType),
  reviewDescription: row.reviewDescription,
  parsedDescription: row.parsedDescription,
  sourceDescription: row.sourceDescription ?? null,
  selectedForImport: row.selectedForImport,
  reviewMatchedTransactionId: row.reviewMatchedTransactionId,
  reviewMatchDismissed: row.reviewMatchDismissed,
});

const savedDecisionIssues = (
  row: ImportMatchDraftRow,
  targetAccountId: string,
  transactionsById: ReadonlyMap<string, MatchTargetFact>,
  candidates: readonly ImportMatchCandidate[]
): { issues: ImportMatchIssue[]; acceptedMatchValid: boolean } => {
  const matchedId = row.reviewMatchedTransactionId;
  if (!matchedId) {
    return { issues: [], acceptedMatchValid: true };
  }

  const issues: ImportMatchIssue[] = [];
  const target = transactionsById.get(matchedId);
  if (!target) {
    issues.push('missing_target');
  } else {
    if (target.deleted) issues.push('deleted_target');
    if (target.accountId !== targetAccountId) issues.push('wrong_account');
  }

  const stillACandidate = candidates.some(
    (item) => item.transactionId === matchedId
  );
  if (!stillACandidate && issues.length === 0) {
    issues.push('invalidated_decision');
  }

  return { issues, acceptedMatchValid: issues.length === 0 };
};

/** Derive match candidates, collisions, and accepted-match decisions for a draft. */
export const evaluateImportMatches = (
  rows: readonly ImportMatchDraftRowSource[],
  options: EvaluateImportMatchesOptions
): Map<string, ImportMatchEvaluation> => {
  const matchRows = rows.map(toImportMatchDraftRow);
  const collisions = collisionGroups(matchRows);
  const transactionsById = new Map(
    options.existingTransactions.map((transaction) => [
      transaction.id,
      transaction,
    ])
  );
  const candidateTransactions = options.existingTransactions.filter(
    (transaction) =>
      !transaction.deleted && transaction.accountId === options.targetAccountId
  );
  const txDescriptions = new Map(
    candidateTransactions.map((transaction) => [
      transaction.id,
      importMatchTransactionDescription(transaction),
    ])
  );
  const selectedIds = new Set(
    matchRows.filter((row) => row.selectedForImport).map((row) => row.id)
  );
  const results = new Map<string, ImportMatchEvaluation>();

  for (const row of matchRows) {
    const facts = importMatchRowFacts(row);
    const classified = candidateTransactions.flatMap((transaction) => {
      const match = classifyAgainstTransaction(
        facts,
        transaction,
        txDescriptions.get(transaction.id) ?? ''
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

    const selectedInCollisionGroup =
      (row.selectedForImport ? 1 : 0) +
      collisionRowIds.filter((id) => selectedIds.has(id)).length;
    // Unresolved until exactly one member is selected. Unselected members stay
    // needs_review (amber) without blocking Continue for other ready rows.
    if (collisionRowIds.length > 0 && selectedInCollisionGroup !== 1) {
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

  const claimedTargets = new Map<string, string[]>();
  for (const [rowId, evaluation] of results) {
    const transactionId = evaluation.acceptedMatch?.transactionId;
    if (!transactionId) continue;
    const rowIds = claimedTargets.get(transactionId) ?? [];
    rowIds.push(rowId);
    claimedTargets.set(transactionId, rowIds);
  }
  for (const rowIds of claimedTargets.values()) {
    if (rowIds.length < 2) continue;
    for (const rowId of rowIds) {
      results.get(rowId)?.issues.push('duplicate_target');
    }
  }

  return results;
};
