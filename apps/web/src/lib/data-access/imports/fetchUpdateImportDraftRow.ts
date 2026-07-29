import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export interface UpdateImportDraftRowResponse {
  row: ImportDraftRow;
  draftRows: ImportDraftRow[];
}

export const fetchUpdateImportDraftRow = (
  rowId: string,
  body: UpdateImportDraftRowInput
): Promise<UpdateImportDraftRowResponse> =>
  apiFetch<{ data: ImportDraftRow; draftRows: ImportDraftRow[] }>(
    `/api/imports/rows/${rowId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  ).then((r) => ({ row: r.data, draftRows: r.draftRows }));
