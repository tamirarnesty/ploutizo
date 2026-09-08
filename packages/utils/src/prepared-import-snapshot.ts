import type { PreparedImportRowSnapshot } from '@ploutizo/types';
import { resolveReviewedImportValues } from './reviewed-import-values';
import type { ImportRowResolvableFields } from './reviewed-import-values';

export type PreparedImportRowSnapshotSource = ImportRowResolvableFields & {
  externalId?: string | null;
  sourceDescription?: string | null;
};

const normalizeNullableTrimmed = (
  value: string | null | undefined
): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Revision-bound prepared-row snapshot from durable draft row fields. */
export const buildPreparedImportRowSnapshot = (
  row: PreparedImportRowSnapshotSource
): PreparedImportRowSnapshot => ({
  reviewedValues: resolveReviewedImportValues(row),
  provenance: {
    externalId: normalizeNullableTrimmed(row.externalId),
    rawDescription: normalizeNullableTrimmed(row.sourceDescription),
  },
});
