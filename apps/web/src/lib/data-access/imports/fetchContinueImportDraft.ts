import type { ImportPreparedSetSummary } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

export const fetchContinueImportDraft = (
  draftId: string,
  signal?: AbortSignal
): Promise<ImportPreparedSetSummary> =>
  apiFetch<{ data: ImportPreparedSetSummary }>(
    `/api/imports/drafts/${draftId}/continue`,
    { method: 'POST', signal }
  ).then((response) => response.data);
