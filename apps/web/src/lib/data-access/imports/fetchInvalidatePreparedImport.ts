import { apiFetch } from '@/lib/queryClient';

export const fetchInvalidatePreparedImport = (draftId: string): Promise<void> =>
  apiFetch<undefined>(`/api/imports/drafts/${draftId}/prepared`, {
    method: 'DELETE',
  }).then(() => undefined);
