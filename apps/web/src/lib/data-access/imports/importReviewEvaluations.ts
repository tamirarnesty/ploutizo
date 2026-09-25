import type { ImportDraftRowEvaluation } from '@ploutizo/utils';

const evaluationSnapshots = new Map<
  string,
  ReadonlyMap<string, ImportDraftRowEvaluation>
>();
const listeners = new Map<string, Set<() => void>>();

const evaluationSignature = (evaluation: ImportDraftRowEvaluation) =>
  JSON.stringify({
    status: evaluation.status,
    invalidReason: evaluation.invalidReason,
    blockers: evaluation.blockers,
    refundLink: evaluation.refundLink,
    refundSuggestion: evaluation.refundSuggestion,
    match: evaluation.match,
  });

const mergeStableEvaluations = (
  previous: ReadonlyMap<string, ImportDraftRowEvaluation>,
  next: ReadonlyMap<string, ImportDraftRowEvaluation>
) => {
  const merged = new Map<string, ImportDraftRowEvaluation>();
  let changed = false;

  for (const [rowId, evaluation] of next) {
    const prior = previous.get(rowId);
    const stable =
      prior && evaluationSignature(prior) === evaluationSignature(evaluation)
        ? prior
        : evaluation;
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
