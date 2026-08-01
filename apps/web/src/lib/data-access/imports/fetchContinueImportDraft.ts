import type { ImportPreparedSet } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

export const fetchContinueImportDraft = (
  draftId: string
): Promise<ImportPreparedSet> =>
  apiFetch<{ data: ImportPreparedSet }>(
    `/api/imports/drafts/${draftId}/continue`,
    { method: 'POST' }
  ).then((response) => response.data);
