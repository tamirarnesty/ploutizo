import type { ImportCompletedResult } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

export const fetchFinalizeImportDraft = (
  draftId: string,
  rowIds: string[]
): Promise<ImportCompletedResult> =>
  apiFetch<{ data: ImportCompletedResult }>(
    `/api/imports/drafts/${draftId}/finalize`,
    {
      method: 'POST',
      body: JSON.stringify({ rowIds }),
    }
  ).then((response) => response.data);
