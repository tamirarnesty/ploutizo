import {
  dataEnvelope,
  importCompletedHistoryItemSchema,
} from '@ploutizo/validators';
import type { ImportCompletedResult } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export const fetchFinalizeImportDraft = (
  draftId: string,
  rowIds: string[]
): Promise<ImportCompletedResult> =>
  apiFetch(
    `/api/imports/drafts/${draftId}/finalize`,
    dataEnvelope(importCompletedHistoryItemSchema),
    {
      method: 'POST',
      body: JSON.stringify({ rowIds }),
    }
  ).then((response) => response.data);
