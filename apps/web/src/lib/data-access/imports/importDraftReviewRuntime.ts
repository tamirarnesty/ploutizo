import type { ImportDraftRowEvaluation } from '@ploutizo/utils';
import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { REVIEW_PATCH_KEYS } from './importDraftRowOptimisticPatch';
import type { Transaction } from '@tanstack/db';
import type { ImportReviewAutosaveSnapshot } from './importReviewAutosave';

export type BaselineFields = Record<
  (typeof REVIEW_PATCH_KEYS)[number],
  unknown
>;

export type DraftAutosaveState = {
  pendingRowIds: Set<string>;
  inFlightCount: number;
  failedFieldKeys: Map<string, string[]>;
  hasSaved: boolean;
};

export type DraftPacedEntry = {
  mutate: (variables: {
    rowId: string;
    patch: UpdateImportDraftRowInput;
  }) => Transaction<ImportReviewRow> | undefined;
  flush: () => Promise<void>;
  cleanup: () => void;
};

export type ImportDraftReviewRuntime = {
  autosave: DraftAutosaveState;
  autosaveSnapshot: ImportReviewAutosaveSnapshot | undefined;
  autosaveListeners: Set<() => void>;
  evaluations: ReadonlyMap<string, ImportDraftRowEvaluation>;
  evaluationListeners: Set<() => void>;
  baselines: Map<string, BaselineFields>;
  paced: DraftPacedEntry | undefined;
};

const runtimes = new Map<string, ImportDraftReviewRuntime>();

const createRuntime = (): ImportDraftReviewRuntime => ({
  autosave: {
    pendingRowIds: new Set(),
    inFlightCount: 0,
    failedFieldKeys: new Map(),
    hasSaved: false,
  },
  autosaveSnapshot: undefined,
  autosaveListeners: new Set(),
  evaluations: new Map(),
  evaluationListeners: new Set(),
  baselines: new Map(),
  paced: undefined,
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
  const runtime = runtimes.get(draftId);
  runtime?.paced?.cleanup();
  runtimes.delete(draftId);
};

export const clearAllImportDraftReviewRuntimes = () => {
  for (const runtime of runtimes.values()) {
    runtime.paced?.cleanup();
  }
  runtimes.clear();
};

export const eachImportDraftReviewRuntime = (
  visit: (runtime: ImportDraftReviewRuntime) => void
) => {
  for (const runtime of runtimes.values()) visit(runtime);
};
