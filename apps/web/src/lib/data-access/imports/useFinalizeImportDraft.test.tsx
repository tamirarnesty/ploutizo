import '@/lib/access/working-set-cleanup';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportCompletedResult } from '@ploutizo/validators';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { HouseholdHookWrapper } from '@/test/household-hook-harness';
import { fetchFinalizeImportDraft } from './fetchFinalizeImportDraft';
import { useFinalizeImportDraft } from './useFinalizeImportDraft';

vi.mock('@/lib/access/AccessProvider', async () => {
  const { householdAccessProviderMock } =
    await import('@/test/householdAccessMock');
  return householdAccessProviderMock;
});

const toastMocks = vi.hoisted(() => ({
  loading: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: toastMocks,
}));

const routerNavigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRouter: () => ({ navigate: routerNavigate }),
}));

vi.mock('./fetchFinalizeImportDraft', () => ({
  fetchFinalizeImportDraft: vi.fn(),
}));

vi.mock('./releaseImportDraftSession', () => ({
  releaseImportDraftSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./cancelImportDraftQueryFetches', () => ({
  cancelImportDraftQueryFetches: vi.fn().mockResolvedValue(undefined),
}));

const counts = {
  created: 2,
  matched: 0,
  skipped: 0,
  invalid: 0,
};

const rowIds = ['row_1', 'row_2'];

const completedResult: ImportCompletedResult = {
  id: 'batch_1',
  account: {
    id: 'acct_1',
    name: 'Visa',
    institutionId: 'td',
    lastFour: '1234',
  },
  contentProfileId: null,
  status: 'completed',
  fileName: 'statement.csv',
  rowCount: 2,
  createdCount: 2,
  matchedCount: 0,
  skippedCount: 0,
  invalidCount: 0,
  importedAt: '2026-05-20T12:00:00.000Z',
  completedAt: '2026-05-21T12:00:00.000Z',
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-21T12:00:00.000Z',
};

describe('useFinalizeImportDraft', () => {
  beforeEach(() => {
    getActiveQueryClient().clear();
    vi.clearAllMocks();
    vi.mocked(fetchFinalizeImportDraft).mockReset();
  });

  it('shows a loading toast keyed by draft id on mutate', async () => {
    vi.mocked(fetchFinalizeImportDraft).mockResolvedValue(completedResult);
    const { result } = renderHook(() => useFinalizeImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ rowIds, counts });
    });

    expect(toastMocks.loading).toHaveBeenCalledWith(
      'Importing 2 transactions…',
      { id: 'import-finalize:draft_1' }
    );
  });

  it('resolves the same toast id to success with View transactions', async () => {
    vi.mocked(fetchFinalizeImportDraft).mockResolvedValue(completedResult);
    const { result } = renderHook(() => useFinalizeImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ rowIds, counts });
    });

    expect(toastMocks.success).toHaveBeenCalledWith('Import completed.', {
      id: 'import-finalize:draft_1',
      action: expect.objectContaining({ label: 'View transactions' }),
    });

    const action = toastMocks.success.mock.calls[0]?.[1]?.action as {
      onClick?: () => void;
    };
    action.onClick?.();
    expect(routerNavigate).toHaveBeenCalledWith({
      to: '/transactions',
      search: { importBatchId: 'batch_1', importOutcome: 'created' },
    });
  });

  it('dismisses the loading toast on NOT_READY finalize errors', async () => {
    vi.mocked(fetchFinalizeImportDraft).mockRejectedValue({
      error: {
        code: 'IMPORT_FINALIZE_NOT_READY',
        message: 'Not ready.',
      },
    });
    const { result } = renderHook(() => useFinalizeImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ rowIds, counts })
      ).rejects.toBeDefined();
    });

    expect(toastMocks.dismiss).toHaveBeenCalledWith('import-finalize:draft_1');
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it('shows an unknown-outcome error with Retry that resends the same variables after unmount', async () => {
    vi.mocked(fetchFinalizeImportDraft).mockRejectedValueOnce({
      error: { code: 'UNKNOWN', message: 'The connection dropped.' },
    });
    const { result, unmount } = renderHook(
      () => useFinalizeImportDraft('draft_1'),
      { wrapper: HouseholdHookWrapper }
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({ rowIds, counts })
      ).rejects.toBeDefined();
    });

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Couldn't confirm the import finished.",
      {
        id: 'import-finalize:draft_1',
        description: "Retry is safe — a finished import won't be duplicated.",
        action: expect.objectContaining({ label: 'Retry' }),
      }
    );

    const retryAction = toastMocks.error.mock.calls[0]?.[1]?.action as {
      onClick?: () => void;
    };

    unmount();
    vi.mocked(fetchFinalizeImportDraft).mockResolvedValue(completedResult);

    act(() => {
      retryAction.onClick?.();
    });

    await waitFor(() => {
      expect(fetchFinalizeImportDraft).toHaveBeenLastCalledWith(
        'draft_1',
        rowIds
      );
    });
    expect(fetchFinalizeImportDraft).toHaveBeenCalledTimes(2);
  });

  it('prefers onUncertainFailureRetry over mutating again when the Finalize page is mounted', async () => {
    const onUncertainFailureRetry = vi.fn();
    vi.mocked(fetchFinalizeImportDraft).mockRejectedValueOnce({
      error: { code: 'UNKNOWN', message: 'The connection dropped.' },
    });
    const { result } = renderHook(
      () =>
        useFinalizeImportDraft('draft_1', {
          onUncertainFailureRetry,
        }),
      { wrapper: HouseholdHookWrapper }
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({ rowIds, counts })
      ).rejects.toBeDefined();
    });

    const retryAction = toastMocks.error.mock.calls[0]?.[1]?.action as {
      onClick?: () => void;
    };

    act(() => {
      retryAction.onClick?.();
    });

    expect(onUncertainFailureRetry).toHaveBeenCalledTimes(1);
    expect(fetchFinalizeImportDraft).toHaveBeenCalledTimes(1);
  });
});
