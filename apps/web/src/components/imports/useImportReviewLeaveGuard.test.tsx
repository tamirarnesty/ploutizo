import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useImportReviewLeaveGuard } from './useImportReviewLeaveGuard';

const useBlocker = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useBlocker,
}));

describe('useImportReviewLeaveGuard', () => {
  beforeEach(() => {
    useBlocker.mockReset();
    useBlocker.mockImplementation(() => undefined);
  });

  it('blocks in-app leave when flush fails and allows leave when flush succeeds', async () => {
    const flush = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    renderHook(() =>
      useImportReviewLeaveGuard({ hasUnsavedWork: true, flush })
    );

    expect(useBlocker).toHaveBeenCalledWith(
      expect.objectContaining({
        enableBeforeUnload: true,
        shouldBlockFn: expect.any(Function),
      })
    );

    const { shouldBlockFn } = useBlocker.mock.calls[0]?.[0] as {
      shouldBlockFn: () => Promise<boolean>;
    };

    await expect(shouldBlockFn()).resolves.toBe(true);
    await expect(shouldBlockFn()).resolves.toBe(false);
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('does not flush or block when there is no unsaved work', async () => {
    const flush = vi.fn();

    renderHook(() =>
      useImportReviewLeaveGuard({ hasUnsavedWork: false, flush })
    );

    const { shouldBlockFn, enableBeforeUnload } = useBlocker.mock
      .calls[0]?.[0] as {
      shouldBlockFn: () => Promise<boolean>;
      enableBeforeUnload: boolean;
    };

    expect(enableBeforeUnload).toBe(false);
    await expect(shouldBlockFn()).resolves.toBe(false);
    expect(flush).not.toHaveBeenCalled();
  });

  it('best-effort flushes on tab hide when unsaved work remains', () => {
    const flush = vi.fn(() => Promise.resolve(true));

    renderHook(() =>
      useImportReviewLeaveGuard({ hasUnsavedWork: true, flush })
    );

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(flush).toHaveBeenCalledTimes(1);
  });
});
