import type { ImportReviewRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { REVIEW_PATCH_KEYS } from './importDraftRowOptimisticPatch';

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
};

type BaselineFields = Record<(typeof REVIEW_PATCH_KEYS)[number], unknown>;

const pickBaselineFields = (row: ImportReviewRow): BaselineFields => {
  const baseline = {} as BaselineFields;
  for (const key of REVIEW_PATCH_KEYS) {
    baseline[key] = row[key as keyof ImportReviewRow];
  }
  return baseline;
};

const draftBaselines = new Map<string, Map<string, BaselineFields>>();

const getDraftBaselines = (draftId: string) => {
  let map = draftBaselines.get(draftId);
  if (!map) {
    map = new Map();
    draftBaselines.set(draftId, map);
  }
  return map;
};

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

export const advanceImportDraftPersistBaseline = (
  draftId: string,
  row: ImportReviewRow
) => {
  getDraftBaselines(draftId).set(row.id, pickBaselineFields(row));
};

export const releaseImportDraftPersistBaselines = (draftId: string) => {
  draftBaselines.delete(draftId);
};

export const endImportDraftPersistBaselines = () => {
  draftBaselines.clear();
};

export const buildDirtyRowPatchFromBaseline = (
  live: ImportReviewRow,
  draftId: string
): UpdateImportDraftRowInput | null => {
  const baseline = getDraftBaselines(draftId).get(live.id);
  if (!baseline) return null;

  const patch: Record<string, unknown> = {};

  for (const field of REVIEW_PATCH_KEYS) {
    if (!valuesEqual(live[field], baseline[field])) {
      patch[field] = live[field];
    }
  }

  return Object.keys(patch).length > 0
    ? (patch as UpdateImportDraftRowInput)
    : null;
};
