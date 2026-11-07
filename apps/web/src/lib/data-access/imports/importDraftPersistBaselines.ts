import { replaceEqualDeep } from '@tanstack/react-query';
import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { REVIEW_PATCH_KEYS } from './importDraftRowOptimisticPatch';

type BaselineFields = Record<(typeof REVIEW_PATCH_KEYS)[number], unknown>;

/** Last server-acknowledged reviewed values per row; the dirty diff is measured against these. */
export type PersistBaselines = Map<string, BaselineFields>;

const pickBaselineFields = (row: ImportReviewRow): BaselineFields => {
  const baseline = {} as BaselineFields;
  for (const key of REVIEW_PATCH_KEYS) {
    baseline[key] = row[key];
  }
  return baseline;
};

/** Keeps an existing baseline; only the first sighting of a row seeds it. */
export const seedPersistBaseline = (
  baselines: PersistBaselines,
  row: ImportReviewRow
) => {
  if (!baselines.has(row.id)) {
    baselines.set(row.id, pickBaselineFields(row));
  }
};

export const advancePersistBaselineFromPatch = (
  baselines: PersistBaselines,
  rowId: string,
  patch: UpdateImportDraftRowInput
) => {
  const current = baselines.get(rowId);
  if (!current) return;
  const next = { ...current };
  for (const key of Object.keys(patch) as (keyof UpdateImportDraftRowInput)[]) {
    if ((REVIEW_PATCH_KEYS as readonly string[]).includes(key)) {
      next[key] = patch[key];
    }
  }
  baselines.set(rowId, next);
};

const fieldValuesEqual = (left: unknown, right: unknown) =>
  replaceEqualDeep(left, right) === left;

export const buildDirtyRowPatchFromBaseline = (
  baselines: PersistBaselines,
  live: ImportReviewRow
): UpdateImportDraftRowInput | null => {
  const baseline = baselines.get(live.id);
  if (!baseline) return null;

  const patch: Record<string, unknown> = {};

  for (const field of REVIEW_PATCH_KEYS) {
    if (!fieldValuesEqual(live[field], baseline[field])) {
      patch[field] = live[field];
    }
  }

  return Object.keys(patch).length > 0
    ? (patch as UpdateImportDraftRowInput)
    : null;
};
