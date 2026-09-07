import type { ImportPreparedConfirmation } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

export const fetchPreparedImport = (
  draftId: string
): Promise<ImportPreparedConfirmation> =>
  apiFetch<{ data: ImportPreparedConfirmation }>(
    `/api/imports/drafts/${draftId}/prepared`
  ).then((response) => response.data);
