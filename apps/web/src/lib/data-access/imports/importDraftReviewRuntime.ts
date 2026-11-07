import type { ImportDraftRowEvaluation } from '@ploutizo/utils';

export type ImportDraftReviewRuntime = {
  evaluations: ReadonlyMap<string, ImportDraftRowEvaluation>;
  evaluationListeners: Set<() => void>;
};

const runtimes = new Map<string, ImportDraftReviewRuntime>();

const createRuntime = (): ImportDraftReviewRuntime => ({
  evaluations: new Map(),
  evaluationListeners: new Set(),
});

export const getImportDraftReviewRuntime = (
  draftId: string
): ImportDraftReviewRuntime => {
  const existing = runtimes.get(draftId);
  if (existing) return existing;
  const created = createRuntime();
  runtimes.set(draftId, created);
  return created;
};

export const deleteImportDraftReviewRuntime = (draftId: string) => {
  runtimes.delete(draftId);
};

export const clearAllImportDraftReviewRuntimes = () => {
  runtimes.clear();
};

export const eachImportDraftReviewRuntime = (
  visit: (runtime: ImportDraftReviewRuntime) => void
) => {
  for (const runtime of runtimes.values()) visit(runtime);
};
