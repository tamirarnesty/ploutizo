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
    matchTargetFacts?: UpdateImportDraftRowResult['matchTargetFacts'];
  }>(`/api/imports/rows/${rowId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }).then((r) => ({
    row: r.data,
    ...(r.refundTargetFacts ? { refundTargetFacts: r.refundTargetFacts } : {}),
    ...(r.matchTargetFacts ? { matchTargetFacts: r.matchTargetFacts } : {}),
  }));
