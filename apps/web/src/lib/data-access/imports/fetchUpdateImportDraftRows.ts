import type {
  ImportDraftPersistedRow,
  UpdateImportDraftRowResult,
} from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export type ImportDraftRowBatchUpdate = {
  id: string;
} & UpdateImportDraftRowInput;

export interface BatchUpdateImportDraftRowsResponse {
  rows: ImportDraftPersistedRow[];
  refundTargetFacts?: UpdateImportDraftRowResult['refundTargetFacts'];
}

export const fetchUpdateImportDraftRows = (
  draftId: string,
  rows: ImportDraftRowBatchUpdate[]
): Promise<BatchUpdateImportDraftRowsResponse> =>
  apiFetch<{ data: BatchUpdateImportDraftRowsResponse }>(
    `/api/imports/drafts/${draftId}/rows`,
    {
      method: 'PATCH',
      body: JSON.stringify({ rows }),
    }
  ).then((r) => r.data);
