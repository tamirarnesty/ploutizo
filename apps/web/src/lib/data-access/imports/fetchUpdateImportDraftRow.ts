import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export const fetchUpdateImportDraftRow = (
  rowId: string,
  body: UpdateImportDraftRowInput
): Promise<ImportDraftRow> =>
  apiFetch<{ data: ImportDraftRow }>(`/api/imports/rows/${rowId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }).then((r) => r.data);
