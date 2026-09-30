import {
  dataEnvelope,
  importFinalizePreviewSchema,
} from '@ploutizo/validators';
import type { ImportFinalizePreview } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export const fetchContinueImportDraft = (
  draftId: string,
  rowIds: string[],
  signal?: AbortSignal
): Promise<ImportFinalizePreview> =>
  apiFetch(
    `/api/imports/drafts/${draftId}/continue`,
    dataEnvelope(importFinalizePreviewSchema),
    {
      method: 'POST',
      body: JSON.stringify({ rowIds }),
      signal,
    }
  ).then((response) => response.data);
