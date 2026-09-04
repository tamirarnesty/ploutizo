import { differenceInCalendarDays } from 'date-fns';
import type { ImportTransactionType } from '@ploutizo/types';
import {
  resolveImportRowReviewAmount,
  resolveImportRowReviewDate,
  resolveImportRowReviewType,
  toImportTransactionType,
} from './import-row-status';

export const IMPORT_MATCH_KIND_VALUES = [
  'external_id',
  'identity',
  'fuzzy_description',
  'date_tolerant',
  'near_amount',
] as const;

export type ImportMatchKind = (typeof IMPORT_MATCH_KIND_VALUES)[number];

export const EXACT_IMPORT_MATCH_KINDS = [
  'external_id',
  'identity',
] as const satisfies readonly ImportMatchKind[];

export type ExactImportMatchKind = (typeof EXACT_IMPORT_MATCH_KINDS)[number];

export const IMPORT_MATCH_DATE_TOLERANCE_DAYS = 7;
export const IMPORT_MATCH_NEAR_AMOUNT_CENTS = 100;
export const IMPORT_MATCH_FUZZY_DESCRIPTION_MIN_SIMILARITY = 0.5;

export type ImportMatchIssue =
  | 'collision'
  | 'invalidated_decision'
  | 'advisory_unresolved'
  | 'missing_target'
  | 'wrong_account'
  | 'deleted_target'
  | 'ambiguous_exact';

export interface ImportMatchTargetTransaction {
  id: string;
  accountId: string;
  type: string;
  date: string;
  amount: number;
  description: string;
  rawDescription: string | null;
  externalId: string | null;
  deleted: boolean;
}

export interface ImportMatchDraftRow {
  id: string;
  externalId: string | null;
  reviewDate: string | null;
  parsedDate: string | null;
  reviewAmount: number | null;
  parsedAmount: number | null;
  reviewType: ImportTransactionType | null;
  parsedType: ImportTransactionType | null;
  reviewDescription: string | null;
  parsedDescription: string | null;
  sourceDescription: string | null;
  selectedForImport: boolean;
  reviewMatchedTransactionId: string | null;
  reviewMatchDismissed: boolean;
}

export interface ImportMatchCandidate {
  transactionId: string;
  kind: ImportMatchKind;
  explanation: string;
}

export interface ImportAcceptedMatch {
  transactionId: string;
  kind: ImportMatchKind;
}

export interface ImportMatchEvaluation {
  candidates: ImportMatchCandidate[];
  exactCandidate: ImportMatchCandidate | null;
  advisoryCandidates: ImportMatchCandidate[];
  collisionRowIds: string[];
  acceptedMatch: ImportAcceptedMatch | null;
  acceptedMatchValid: boolean;
  /** Selected-row Continue block: invalidated decisions, selected collisions, unresolved advisory. */
  matchBlocked: boolean;
  /** Review-visible uncertainty, including unselected advisory/collision rows. */
  matchNeedsReview: boolean;
  issues: ImportMatchIssue[];
}

export interface EvaluateImportMatchesOptions {
  targetAccountId: string;
  existingTransactions: readonly ImportMatchTargetTransaction[];
}

const EXACT_MATCH_EXPLANATIONS: Record<ExactImportMatchKind, string> = {
  external_id: 'Exact external ID match on this card.',
  identity: 'Exact match on type, date, amount, and original description.',
};

const ADVISORY_MATCH_EXPLANATIONS: Record<
  Exclude<ImportMatchKind, ExactImportMatchKind>,
  string
> = {
  fuzzy_description: 'Similar description on the same date and amount.',
  date_tolerant:
    'Possible settlement match with a nearby date and the same amount.',
  near_amount: 'Possible match with a nearby amount on the same date.',
};

const isExactMatchKind = (
  kind: ImportMatchKind
): kind is ExactImportMatchKind =>
  kind === 'external_id' || kind === 'identity';

const candidate = (
  transactionId: string,
  kind: ImportMatchKind
): ImportMatchCandidate => ({
  transactionId,
  kind,
  explanation: isExactMatchKind(kind)
    ? EXACT_MATCH_EXPLANATIONS[kind]
    : ADVISORY_MATCH_EXPLANATIONS[kind],
});

export const normalizeImportMatchDescription = (
  value: string | null | undefined
): string =>
  (value ?? '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const descriptionTokens = (value: string): Set<string> =>
  new Set(value.split(' ').filter(Boolean));

const jaccardSimilarity = (left: string, right: string): number => {
  const leftTokens = descriptionTokens(left);
  const rightTokens = descriptionTokens(right);
  if (leftTokens.size === 0 && rightTokens.size === 0) return 1;
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  const union = leftTokens.size + rightTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

export const importDescriptionsAreSimilar = (
  left: string,
  right: string
): boolean => {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  return (
    jaccardSimilarity(left, right) >=
    IMPORT_MATCH_FUZZY_DESCRIPTION_MIN_SIMILARITY
  );
};

const rowRawDescription = (row: ImportMatchDraftRow): string =>
  normalizeImportMatchDescription(
    row.sourceDescription ?? row.parsedDescription
  );

const transactionRawDescription = (
  transaction: ImportMatchTargetTransaction
): string =>
  normalizeImportMatchDescription(
    transaction.rawDescription ?? transaction.description
  );

const classifyAgainstTransaction = (
  row: ImportMatchDraftRow,
  transaction: ImportMatchTargetTransaction,
  targetAccountId: string
): ImportMatchCandidate | null => {
  if (transaction.accountId !== targetAccountId) return null;
  if (transaction.deleted) return null;

  const rowExternalId = row.externalId?.trim() || null;
  const txExternalId = transaction.externalId?.trim() || null;
  if (rowExternalId && txExternalId && rowExternalId === txExternalId) {
    return candidate(transaction.id, 'external_id');
  }

  const type = resolveImportRowReviewType({
    reviewType: toImportTransactionType(row.reviewType),
    parsedType: toImportTransactionType(row.parsedType),
  });
  const date = resolveImportRowReviewDate(row);
  const amount = resolveImportRowReviewAmount(row);
  if (!type || !date || amount == null) return null;
  if (transaction.type !== type) return null;

  const rowDescription = rowRawDescription(row);
  const txDescription = transactionRawDescription(transaction);
  const sameDate = transaction.date === date;
  const sameAmount = transaction.amount === amount;
  const sameRawDescription = rowDescription === txDescription;
  const similarDescription = importDescriptionsAreSimilar(
    rowDescription,
    txDescription
  );

  if (!rowExternalId && sameDate && sameAmount && sameRawDescription) {
    return candidate(transaction.id, 'identity');
  }

  if (sameDate && sameAmount && similarDescription && !sameRawDescription) {
    return candidate(transaction.id, 'fuzzy_description');
  }

  if (type === 'settlement' && sameAmount && similarDescription && !sameDate) {
    const dayDiff = Math.abs(differenceInCalendarDays(date, transaction.date));
    if (dayDiff > 0 && dayDiff <= IMPORT_MATCH_DATE_TOLERANCE_DAYS) {
      return candidate(transaction.id, 'date_tolerant');
    }
  }

  if (sameDate && similarDescription && !sameAmount) {
    const amountDiff = Math.abs(transaction.amount - amount);
    if (amountDiff > 0 && amountDiff <= IMPORT_MATCH_NEAR_AMOUNT_CENTS) {
      return candidate(transaction.id, 'near_amount');
    }
  }

  return null;
};

const collisionGroups = (
  rows: readonly ImportMatchDraftRow[]
): Map<string, string[]> => {
  const byExternalId = new Map<string, string[]>();
  for (const row of rows) {
    const externalId = row.externalId?.trim();
    if (!externalId) continue;
    const ids = byExternalId.get(externalId) ?? [];
    ids.push(row.id);
    byExternalId.set(externalId, ids);
  }
  const groups = new Map<string, string[]>();
  for (const ids of byExternalId.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      groups.set(
        id,
        ids.filter((otherId) => otherId !== id)
      );
    }
  }
  return groups;
};

const decisionIssues = (
  row: ImportMatchDraftRow,
  targetAccountId: string,
  transactionsById: ReadonlyMap<string, ImportMatchTargetTransaction>,
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
      isExactMatchKind(item.kind)
    );
    const advisoryCandidates = classified.filter(
      (item) => !isExactMatchKind(item.kind)
    );
    const exactCandidate =
      exactMatches.length === 1 ? (exactMatches[0] ?? null) : null;
    const collisionRowIds = collisions.get(row.id) ?? [];
    const issues: ImportMatchIssue[] = [];

    if (exactMatches.length > 1) {
      issues.push('ambiguous_exact');
    }
    if (collisionRowIds.length > 0) {
      issues.push('collision');
    }

    const decision = decisionIssues(
      row,
      options.targetAccountId,
      transactionsById,
      classified
    );
    issues.push(...decision.issues);

    const selectedCollisionCount = collisionRowIds.filter((id) =>
      selectedIds.has(id)
    ).length;
    const collisionBlocksContinue =
      row.selectedForImport &&
      collisionRowIds.length > 0 &&
      selectedCollisionCount > 0;

    const hasUnresolvedAdvisory =
      row.selectedForImport &&
      !row.reviewMatchDismissed &&
      !row.reviewMatchedTransactionId &&
      advisoryCandidates.length > 0 &&
      exactCandidate === null;

    if (hasUnresolvedAdvisory) {
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

    const matchBlocked =
      collisionBlocksContinue ||
      (row.selectedForImport && !decision.acceptedMatchValid) ||
      hasUnresolvedAdvisory;

    const selectedInCollisionGroup =
      (row.selectedForImport ? 1 : 0) + selectedCollisionCount;
    const collisionNeedsReview =
      collisionRowIds.length > 0 && selectedInCollisionGroup !== 1;
    const advisoryNeedsReview =
      advisoryCandidates.length > 0 &&
      !row.reviewMatchDismissed &&
      !row.reviewMatchedTransactionId &&
      exactCandidate === null;

    results.set(row.id, {
      candidates: classified,
      exactCandidate,
      advisoryCandidates,
      collisionRowIds,
      acceptedMatch,
      acceptedMatchValid: decision.acceptedMatchValid,
      matchBlocked,
      matchNeedsReview:
        matchBlocked || collisionNeedsReview || advisoryNeedsReview,
      issues,
    });
  }

  return results;
};

export const toImportMatchDraftRow = (row: {
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
  reviewMatchedTransactionId?: string | null;
  reviewMatchDismissed?: boolean;
}): ImportMatchDraftRow => ({
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
  reviewMatchedTransactionId: row.reviewMatchedTransactionId ?? null,
  reviewMatchDismissed: row.reviewMatchDismissed ?? false,
});

export const matchDecisionForSelectionChange = (input: {
  selectedForImport: boolean;
  currentMatchedTransactionId: string | null;
  dismissed: boolean;
  exactCandidate: ImportMatchCandidate | null;
}): string | null => {
  if (!input.selectedForImport) return null;
  if (input.dismissed) return null;
  if (input.currentMatchedTransactionId) {
    return input.currentMatchedTransactionId;
  }
  return input.exactCandidate?.transactionId ?? null;
};
