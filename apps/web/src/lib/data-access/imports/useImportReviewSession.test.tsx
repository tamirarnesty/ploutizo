import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { queryClient } from '@/lib/queryClient';
import { fetchImportDraft } from './useGetImportDraft';
import { resetImportDraftRowsCollectionsForTests } from './getImportDraftRowsCollection';
import { useImportReviewSession } from './useImportReviewSession';
import type { ReactNode } from 'react';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

const draft = makeImportDraft({
  id: 'draft_session_1',
  accountName: 'Amex',
  fileName: 'amex.csv',
  rows: [
    makeImportDraftRow({
      id: 'row_ready',
      rowNumber: 2,
      reviewDescription: 'Coffee',
    }),
    makeImportDraftRow({
      id: 'row_b',
      rowNumber: 3,
      reviewDescription: 'Groceries',
      reviewCategoryId: null,
      status: 'needs_review',
    }),
  ],
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useImportReviewSession', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
  });

  afterEach(async () => {
    await resetImportDraftRowsCollectionsForTests();
    queryClient.clear();
  });

  it('hydrates slim draft meta and live rows from one draft GET', async () => {
    const { result, unmount } = renderHook(
      () => useImportReviewSession('draft_session_1'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.meta).toBeDefined();
    });

    expect(fetchImportDraft).toHaveBeenCalledTimes(1);
    expect(fetchImportDraft).toHaveBeenCalledWith('draft_session_1');

    expect(result.current.meta).toMatchObject({
      id: 'draft_session_1',
      accountName: 'Amex',
      fileName: 'amex.csv',
      rowCount: 2,
    });
    expect(result.current.meta).not.toHaveProperty('rows');

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows.map((row) => row.id)).toEqual([
      'row_ready',
      'row_b',
    ]);
    expect(result.current.rows[0]?.reviewDescription).toBe('Coffee');
    expect(result.current.isError).toBe(false);
    unmount();
  });

  it('releases the session collection on unmount so remount can re-hydrate', async () => {
    const { unmount } = renderHook(
      () => useImportReviewSession('draft_session_1'),
      { wrapper }
    );

    await waitFor(() => {
      expect(fetchImportDraft).toHaveBeenCalledTimes(1);
    });
    unmount();

    const { result, unmount: unmountAgain } = renderHook(
      () => useImportReviewSession('draft_session_1'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.meta?.id).toBe('draft_session_1');
      expect(result.current.rows).toHaveLength(2);
    });
    // Warm Query cache may satisfy the remount; collection is a fresh session instance.
    expect(result.current.isError).toBe(false);
    unmountAgain();
  });

  it('exposes error state when the draft GET fails', async () => {
    vi.mocked(fetchImportDraft).mockRejectedValue(new Error('not found'));

    const { result, unmount } = renderHook(
      () => useImportReviewSession('missing_draft'),
      { wrapper }
    );

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.meta).toBeUndefined();
    expect(result.current.rows).toEqual([]);
    unmount();
  });
});
