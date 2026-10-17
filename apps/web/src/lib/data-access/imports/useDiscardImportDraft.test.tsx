import '@/lib/access/working-set-cleanup';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HouseholdHookWrapper } from '@/test/household-hook-harness';
import { releaseImportDraftSession } from './releaseImportDraftSession';
import { useDiscardImportDraft } from './useDiscardImportDraft';

vi.mock('@/lib/access/access-context', async () => {
  const { householdAccessProviderMock } =
    await import('@/test/householdAccessMock');
  return householdAccessProviderMock;
});

vi.mock('@/lib/queryClient', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiSend: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./releaseImportDraftSession', () => ({
  releaseImportDraftSession: vi.fn(),
}));

vi.mock('./cancelImportDraftQueryFetches', () => ({
  cancelImportDraftQueryFetches: vi.fn().mockResolvedValue(undefined),
}));

describe('useDiscardImportDraft', () => {
  it('settles while the draft session release is still waiting on mounted subscribers', async () => {
    vi.mocked(releaseImportDraftSession).mockReturnValue(
      new Promise<void>(() => {})
    );
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useDiscardImportDraft(), {
      wrapper: HouseholdHookWrapper,
    });

    act(() => {
      result.current.mutate('draft_1', { onSuccess });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
    expect(result.current.isPending).toBe(false);
    expect(releaseImportDraftSession).toHaveBeenCalledWith('draft_1');
  });
});
