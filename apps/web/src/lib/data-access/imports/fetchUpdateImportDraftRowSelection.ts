import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowSelectionInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export const fetchUpdateImportDraftRowSelection = (
  draftId: string,
  body: UpdateImportDraftRowSelectionInput
): Promise<ImportDraftRow[]> =>
  apiFetch<{ data: ImportDraftRow[] }>(
    `/api/imports/drafts/${draftId}/rows/selection`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  ).then((r) => r.data);
