import { updateImportDraftRowsResponseSchema } from '@ploutizo/validators';
import type {
  BatchUpdateImportDraftRowsInput,
  BatchUpdateImportDraftRowsResult,
} from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export type ImportDraftRowBatchUpdate =
  BatchUpdateImportDraftRowsInput['rows'][number];

export const fetchUpdateImportDraftRows = (
  draftId: string,
  rows: ImportDraftRowBatchUpdate[]
): Promise<BatchUpdateImportDraftRowsResult> =>
  apiFetch(
    `/api/imports/drafts/${draftId}/rows`,
    updateImportDraftRowsResponseSchema,
    { method: 'PATCH', body: JSON.stringify({ rows }) }
  ).then((r) => ({
    rows: r.data,
    ...(r.refundTargetFacts ? { refundTargetFacts: r.refundTargetFacts } : {}),
  }));
