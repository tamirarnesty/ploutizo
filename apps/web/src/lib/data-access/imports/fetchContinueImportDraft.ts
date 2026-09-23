import type { ImportFinalizePreview } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

export const fetchContinueImportDraft = (
  draftId: string,
  rowIds: string[],
  signal?: AbortSignal
): Promise<ImportFinalizePreview> =>
  apiFetch<{ data: ImportFinalizePreview }>(
    `/api/imports/drafts/${draftId}/continue`,
    {
      method: 'POST',
      body: JSON.stringify({ rowIds }),
      signal,
    }
  ).then((response) => response.data);
