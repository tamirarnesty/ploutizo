import type { ImportPreparedSet } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

export const fetchContinueImportDraft = (
  draftId: string,
  signal?: AbortSignal
): Promise<ImportPreparedSet> =>
  apiFetch<{ data: ImportPreparedSet }>(
    `/api/imports/drafts/${draftId}/continue`,
    { method: 'POST', signal }
  ).then((response) => response.data);
