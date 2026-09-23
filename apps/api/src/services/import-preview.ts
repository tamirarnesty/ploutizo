import { countImportOutcomes } from '@ploutizo/types';
import type {
  ImportFinalizePreview,
  ImportFinalizePreviewRow,
} from '@ploutizo/types';
import type { ImportRowProjection } from '@ploutizo/utils/import-set-verification';

export const toImportFinalizePreview = (
  batchId: string,
  rowCount: number,
  projection: readonly ImportRowProjection[]
): ImportFinalizePreview => {
  const created: ImportFinalizePreviewRow[] = [];
  const matched: ImportFinalizePreviewRow[] = [];

  for (const row of projection) {
    if (row.outcome !== 'created' && row.outcome !== 'matched') continue;
    const item: ImportFinalizePreviewRow = {
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
    counts: countImportOutcomes(projection),
    created,
    matched,
  };
};
