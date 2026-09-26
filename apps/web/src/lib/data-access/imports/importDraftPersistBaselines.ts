import { replaceEqualDeep } from '@tanstack/react-query';
import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { REVIEW_PATCH_KEYS } from './importDraftRowOptimisticPatch';
import {
  eachImportDraftReviewRuntime,
  getImportDraftReviewRuntime,
} from './importDraftReviewRuntime';
import type { BaselineFields } from './importDraftReviewRuntime';

export type { BaselineFields };

const pickBaselineFields = (row: ImportReviewRow): BaselineFields => {
  const baseline = {} as BaselineFields;
  for (const key of REVIEW_PATCH_KEYS) {
    baseline[key] = row[key];
  }
  return baseline;
};

const getDraftBaselines = (draftId: string) =>
  getImportDraftReviewRuntime(draftId).baselines;

export const seedImportDraftPersistBaselines = (
  draftId: string,
  rows: readonly ImportReviewRow[]
) => {
  const map = getDraftBaselines(draftId);
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, pickBaselineFields(row));
    }
  }
};

export const advanceImportDraftPersistBaselineFromPatch = (
  draftId: string,
  rowId: string,
  patch: UpdateImportDraftRowInput
) => {
  const map = getDraftBaselines(draftId);
  const current = map.get(rowId);
  if (!current) return;
  const next = { ...current };
  for (const key of Object.keys(patch) as (keyof UpdateImportDraftRowInput)[]) {
    if ((REVIEW_PATCH_KEYS as readonly string[]).includes(key)) {
      next[key] = patch[key];
    }
  }
  map.set(rowId, next);
};

export const releaseImportDraftPersistBaselines = (draftId: string) => {
  getDraftBaselines(draftId).clear();
};

export const endImportDraftPersistBaselines = () => {
  eachImportDraftReviewRuntime((runtime) => runtime.baselines.clear());
};

const fieldValuesEqual = (left: unknown, right: unknown) =>
  replaceEqualDeep(left, right) === left;

export const buildDirtyRowPatchFromBaseline = (
  live: ImportReviewRow,
  draftId: string
): UpdateImportDraftRowInput | null => {
  const baseline = getDraftBaselines(draftId).get(live.id);
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
