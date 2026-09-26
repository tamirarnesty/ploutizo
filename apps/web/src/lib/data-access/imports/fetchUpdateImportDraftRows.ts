import type {
  BatchUpdateImportDraftRowsResult,
  ImportDraftPersistedRow,
  UpdateImportDraftRowResult,
} from '@ploutizo/types';
import type { BatchUpdateImportDraftRowsInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export type ImportDraftRowBatchUpdate =
  BatchUpdateImportDraftRowsInput['rows'][number];

export const fetchUpdateImportDraftRows = (
  draftId: string,
  rows: ImportDraftRowBatchUpdate[]
): Promise<BatchUpdateImportDraftRowsResult> =>
  apiFetch<{
    data: ImportDraftPersistedRow[];
    refundTargetFacts?: UpdateImportDraftRowResult['refundTargetFacts'];
  }>(`/api/imports/drafts/${draftId}/rows`, {
    method: 'PATCH',
    body: JSON.stringify({ rows }),
  }).then((r) => ({
    rows: r.data,
    ...(r.refundTargetFacts ? { refundTargetFacts: r.refundTargetFacts } : {}),
  }));
