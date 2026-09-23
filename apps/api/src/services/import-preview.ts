import { isImportPreparedProjectionOutcome } from '@ploutizo/types';
import type {
  ImportFinalizePreview,
  ImportPreparedConfirmationRow,
  ImportPreparedOutcomeCounts,
} from '@ploutizo/types';
import type { PreparedImportOutcomeProjection } from '@ploutizo/utils/import-set-verification';

export const countProjectionOutcomes = (
  projection: readonly PreparedImportOutcomeProjection[]
): ImportPreparedOutcomeCounts => {
  const counts: ImportPreparedOutcomeCounts = {
    created: 0,
    matched: 0,
    skipped: 0,
    invalid: 0,
  };
  for (const row of projection) {
    if (row.outcome === 'created') counts.created += 1;
    else if (row.outcome === 'matched') counts.matched += 1;
    else if (row.outcome === 'skipped') counts.skipped += 1;
    else counts.invalid += 1;
  }
  return counts;
};

export const toImportFinalizePreview = (
  batchId: string,
  rowCount: number,
  projection: readonly PreparedImportOutcomeProjection[]
): ImportFinalizePreview => {
  const counts = countProjectionOutcomes(projection);
  const created: ImportPreparedConfirmationRow[] = [];
  const matched: ImportPreparedConfirmationRow[] = [];

  for (const row of projection) {
    if (!isImportPreparedProjectionOutcome(row.outcome)) continue;
    if (row.outcome !== 'created' && row.outcome !== 'matched') continue;
    const item: ImportPreparedConfirmationRow = {
      batchRowId: row.batchRowId,
      outcome: row.outcome,
      transactionId: row.transactionId,
      snapshot: row.snapshot,
    };
    if (row.outcome === 'created') created.push(item);
    else matched.push(item);
  }

  return {
    batchId,
    rowCount,
    counts,
    created,
    matched,
  };
};
