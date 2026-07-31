import type {
  ImportDraftPersistedRow,
  UpdateImportDraftRowResult,
} from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export const fetchUpdateImportDraftRow = (
  rowId: string,
  body: UpdateImportDraftRowInput
): Promise<UpdateImportDraftRowResult> =>
  apiFetch<{
    data: ImportDraftPersistedRow;
    refundTargetFacts?: UpdateImportDraftRowResult['refundTargetFacts'];
  }>(`/api/imports/rows/${rowId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }).then((r) => ({
    row: r.data,
    ...(r.refundTargetFacts ? { refundTargetFacts: r.refundTargetFacts } : {}),
  }));
