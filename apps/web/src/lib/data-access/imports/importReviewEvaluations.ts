import type {
  ImportAcceptedMatch,
  ImportDraftRowEvaluation,
  ImportMatchCandidate,
  ImportMatchEvaluation,
  ImportRefundLinkEvaluation,
  ImportRefundSuggestion,
} from '@ploutizo/utils';
import { importReviewFieldValuesEqual } from './importReviewFieldEqual';

const evaluationSnapshots = new Map<
  string,
  ReadonlyMap<string, ImportDraftRowEvaluation>
>();
const listeners = new Map<string, Set<() => void>>();

const sameItems = <T>(
  left: readonly T[],
  right: readonly T[],
  equal: (leftItem: T, rightItem: T) => boolean
) => {
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index];
    return other !== undefined && equal(item, other);
  });
};

const nullableEqual = <T>(
  left: T | null,
  right: T | null,
  equal: (leftValue: T, rightValue: T) => boolean
) => {
  if (Object.is(left, right)) return true;
  if (left == null || right == null) return false;
  return equal(left, right);
};

const matchCandidateEqual = (
  left: ImportMatchCandidate,
  right: ImportMatchCandidate
) => {
  const compared = {
    transactionId: left.transactionId === right.transactionId,
    kind: left.kind === right.kind,
    explanation: left.explanation === right.explanation,
  } satisfies Record<keyof ImportMatchCandidate, boolean>;
  return Object.values(compared).every(Boolean);
};

const acceptedMatchEqual = (
  left: ImportAcceptedMatch,
  right: ImportAcceptedMatch
) => {
  const compared = {
    transactionId: left.transactionId === right.transactionId,
    kind: left.kind === right.kind,
  } satisfies Record<keyof ImportAcceptedMatch, boolean>;
  return Object.values(compared).every(Boolean);
};

const matchEqual = (
  left: ImportMatchEvaluation,
  right: ImportMatchEvaluation
) => {
  const compared = {
    candidates: sameItems(
      left.candidates,
      right.candidates,
      matchCandidateEqual
    ),
    exactCandidate: nullableEqual(
      left.exactCandidate,
      right.exactCandidate,
      matchCandidateEqual
    ),
    advisoryCandidates: sameItems(
      left.advisoryCandidates,
      right.advisoryCandidates,
      matchCandidateEqual
    ),
    collisionRowIds: importReviewFieldValuesEqual(
      left.collisionRowIds,
      right.collisionRowIds
    ),
    acceptedMatch: nullableEqual(
      left.acceptedMatch,
      right.acceptedMatch,
      acceptedMatchEqual
    ),
    acceptedMatchValid: left.acceptedMatchValid === right.acceptedMatchValid,
    issues: importReviewFieldValuesEqual(left.issues, right.issues),
  } satisfies Record<keyof ImportMatchEvaluation, boolean>;
  return Object.values(compared).every(Boolean);
};

const refundLinkEqual = (
  left: ImportRefundLinkEvaluation,
  right: ImportRefundLinkEvaluation
) => {
  const compared = {
    linked: left.linked === right.linked,
    valid: left.valid === right.valid,
    issues: importReviewFieldValuesEqual(left.issues, right.issues),
    inheritedCategoryId: left.inheritedCategoryId === right.inheritedCategoryId,
    inheritedAssigneeMemberIds: importReviewFieldValuesEqual(
      left.inheritedAssigneeMemberIds,
      right.inheritedAssigneeMemberIds
    ),
  } satisfies Record<keyof ImportRefundLinkEvaluation, boolean>;
  return Object.values(compared).every(Boolean);
};

const refundSuggestionEqual = (
  left: ImportRefundSuggestion,
  right: ImportRefundSuggestion
) => {
  const compared = {
    kind: left.kind === right.kind,
    transactionId: left.transactionId === right.transactionId,
    batchRowId: left.batchRowId === right.batchRowId,
    explanation: left.explanation === right.explanation,
  } satisfies Record<keyof ImportRefundSuggestion, boolean>;
  return Object.values(compared).every(Boolean);
};

const evaluationsEqual = (
  left: ImportDraftRowEvaluation,
  right: ImportDraftRowEvaluation
) => {
  const compared = {
    status: left.status === right.status,
    blockers: importReviewFieldValuesEqual(left.blockers, right.blockers),
    invalidReason: Object.is(left.invalidReason, right.invalidReason),
    refundLink: nullableEqual(
      left.refundLink,
      right.refundLink,
      refundLinkEqual
    ),
    refundSuggestion: nullableEqual(
      left.refundSuggestion,
      right.refundSuggestion,
      refundSuggestionEqual
    ),
    match: nullableEqual(left.match, right.match, matchEqual),
  } satisfies Record<keyof ImportDraftRowEvaluation, boolean>;
  return Object.values(compared).every(Boolean);
};

const mergeStableEvaluations = (
  previous: ReadonlyMap<string, ImportDraftRowEvaluation>,
  next: ReadonlyMap<string, ImportDraftRowEvaluation>
) => {
  const merged = new Map<string, ImportDraftRowEvaluation>();
  let changed = false;

  for (const [rowId, evaluation] of next) {
    const prior = previous.get(rowId);
    const stable =
      prior && evaluationsEqual(prior, evaluation) ? prior : evaluation;
    if (stable !== prior) changed = true;
    merged.set(rowId, stable);
  }

  if (previous.size !== merged.size) changed = true;
  for (const rowId of previous.keys()) {
    if (!merged.has(rowId)) {
      changed = true;
      break;
    }
  }

  return { merged, changed };
};

const emit = (draftId: string) => {
  const draftListeners = listeners.get(draftId);
  if (!draftListeners) return;
  for (const listener of draftListeners) listener();
};

export const publishImportReviewEvaluations = (
  draftId: string,
  evaluations: ReadonlyMap<string, ImportDraftRowEvaluation>
) => {
  const previous = evaluationSnapshots.get(draftId) ?? new Map();
  const { merged, changed } = mergeStableEvaluations(previous, evaluations);
  if (!changed) return;
  evaluationSnapshots.set(draftId, merged);
  emit(draftId);
};

export const getImportReviewRowEvaluation = (
  draftId: string,
  rowId: string
): ImportDraftRowEvaluation | null =>
  evaluationSnapshots.get(draftId)?.get(rowId) ?? null;

export const subscribeImportReviewEvaluations = (
  draftId: string,
  listener: () => void
) => {
  let draftListeners = listeners.get(draftId);
  if (!draftListeners) {
    draftListeners = new Set();
    listeners.set(draftId, draftListeners);
  }
  draftListeners.add(listener);
  return () => {
    draftListeners.delete(listener);
    if (draftListeners.size === 0) listeners.delete(draftId);
  };
};

export const releaseImportReviewEvaluations = (draftId: string) => {
  evaluationSnapshots.delete(draftId);
  listeners.delete(draftId);
};

export const endImportReviewEvaluations = () => {
  evaluationSnapshots.clear();
  listeners.clear();
};
