import type { ImportRowSnapshot } from '@ploutizo/types';
import { resolveReviewedImportValues } from './reviewed-import-values';
import type { ImportRowResolvableFields } from './reviewed-import-values';

export type ImportRowSnapshotSource = ImportRowResolvableFields & {
  externalId?: string | null;
  sourceDescription?: string | null;
};

const normalizeNullableTrimmed = (
  value: string | null | undefined
): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Reviewed values and provenance snapshot from durable draft row fields. */
export const buildImportRowSnapshot = (
  row: ImportRowSnapshotSource
): ImportRowSnapshot => ({
  reviewedValues: resolveReviewedImportValues(row),
  provenance: {
    externalId: normalizeNullableTrimmed(row.externalId),
    rawDescription: normalizeNullableTrimmed(row.sourceDescription),
    parsedDescription: normalizeNullableTrimmed(row.parsedDescription),
  },
});
