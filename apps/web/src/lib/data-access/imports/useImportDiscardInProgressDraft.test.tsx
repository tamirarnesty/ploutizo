import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRouterMocks, routerMocks } from '@/test/mockTanstackRouter';
import { useImportDiscardInProgressDraft } from './useImportDiscardInProgressDraft';

const discardMocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  variables: undefined as string | undefined,
}));

vi.mock('./useDiscardImportDraft', () => ({
  useDiscardImportDraft: () => ({
    mutate: discardMocks.mutate,
    isPending: discardMocks.isPending,
    variables: discardMocks.variables,
  }),
}));

describe('useImportDiscardInProgressDraft', () => {
  beforeEach(() => {
    resetRouterMocks();
    discardMocks.mutate.mockReset();
    discardMocks.isPending = false;
    discardMocks.variables = undefined;
  });

  it('navigates to the import hub after a successful discard', async () => {
    discardMocks.mutate.mockImplementation((_draftId, options) => {
      options?.onSuccess?.();
    });

    const { result } = renderHook(() =>
      useImportDiscardInProgressDraft('draft_1')
    );
    result.current.discard();

    expect(discardMocks.mutate).toHaveBeenCalledWith(
      'draft_1',
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    await waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalledWith({
        to: '/import',
        ignoreBlocker: true,
      });
    });
  });
});
