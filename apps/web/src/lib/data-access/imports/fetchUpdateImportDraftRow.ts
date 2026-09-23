import type {
  ImportDraftPersistedRow,
  UpdateImportDraftRowResult,
} from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export const fetchUpdateImportDraftRow = (
  draftId: string,
  rowId: string,
  body: UpdateImportDraftRowInput
): Promise<UpdateImportDraftRowResult> =>
  apiFetch<{
    data: ImportDraftPersistedRow[];
    refundTargetFacts?: UpdateImportDraftRowResult['refundTargetFacts'];
  }>(`/api/imports/drafts/${draftId}/rows`, {
    method: 'PATCH',
    body: JSON.stringify({ rows: [{ id: rowId, ...body }] }),
  }).then((r) => ({
    row: r.data[0],
    ...(r.refundTargetFacts ? { refundTargetFacts: r.refundTargetFacts } : {}),
  }));
