import { replaceEqualDeep } from '@tanstack/react-query';
import type { ImportDraftRowEvaluation } from '@ploutizo/utils';
import {
  eachImportDraftReviewRuntime,
  getImportDraftReviewRuntime,
} from './importDraftReviewRuntime';

const emit = (draftId: string) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  for (const listener of runtime.evaluationListeners) listener();
};

export const publishImportReviewEvaluations = (
  draftId: string,
  evaluations: ReadonlyMap<string, ImportDraftRowEvaluation>
) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  const previous = runtime.evaluations;
  const merged = new Map<string, ImportDraftRowEvaluation>();
  let changed = false;

  for (const [rowId, evaluation] of evaluations) {
    const prior = previous.get(rowId);
    const stable =
      prior !== undefined ? replaceEqualDeep(prior, evaluation) : evaluation;
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

  if (!changed) return;
  runtime.evaluations = merged;
  emit(draftId);
};

export const getImportReviewRowEvaluation = (
  draftId: string,
  rowId: string
): ImportDraftRowEvaluation | null =>
  getImportDraftReviewRuntime(draftId).evaluations.get(rowId) ?? null;

export const subscribeImportReviewEvaluations = (
  draftId: string,
  listener: () => void
) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  runtime.evaluationListeners.add(listener);
  return () => {
    runtime.evaluationListeners.delete(listener);
  };
};

export const releaseImportReviewEvaluations = (draftId: string) => {
  const runtime = getImportDraftReviewRuntime(draftId);
  runtime.evaluations = new Map();
  runtime.evaluationListeners.clear();
};

export const endImportReviewEvaluations = () => {
  eachImportDraftReviewRuntime((runtime) => {
    runtime.evaluations = new Map();
    runtime.evaluationListeners.clear();
  });
};
