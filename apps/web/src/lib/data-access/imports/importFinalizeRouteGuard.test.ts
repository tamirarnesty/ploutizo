import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import type { ImportFinalizePreview } from '@ploutizo/types';
import { importDraftReviewRoute } from '@/lib/navigation';
import {
  assertImportFinalizePreviewSession,
  readImportFinalizePreviewSession,
} from './importFinalizeRouteGuard';
import { importFinalizePreviewSessionQueryKey } from './queryKeys';

const preview: ImportFinalizePreview = {
  batchId: 'draft_1',
  rowCount: 1,
  counts: { created: 1, matched: 0, skipped: 0, invalid: 0 },
  created: [],
  matched: [],
};

describe('assertImportFinalizePreviewSession', () => {
  it('allows finalize when a preview session exists', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(importFinalizePreviewSessionQueryKey('draft_1'), {
      rowIds: ['row_1'],
      preview,
    });
    expect(() =>
      assertImportFinalizePreviewSession(queryClient, 'draft_1')
    ).not.toThrow();
    expect(
      readImportFinalizePreviewSession(queryClient, 'draft_1')?.preview
    ).toBe(preview);
  });

  it('redirects to review when the preview session is missing', () => {
    const queryClient = new QueryClient();
    try {
      assertImportFinalizePreviewSession(queryClient, 'draft_1');
      expect.fail('expected redirect');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: unknown }).options).toMatchObject({
        ...importDraftReviewRoute('draft_1'),
        state: { importReview: { prepareAgain: true } },
      });
    }
  });
});
