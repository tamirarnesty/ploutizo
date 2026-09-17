import type { ImportPreparedConfirmation } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

export const fetchPreparedImport = (
  draftId: string,
  signal?: AbortSignal
): Promise<ImportPreparedConfirmation> =>
  apiFetch<{ data: ImportPreparedConfirmation }>(
    `/api/imports/drafts/${draftId}/prepared`,
    { signal }
  ).then((response) => response.data);
