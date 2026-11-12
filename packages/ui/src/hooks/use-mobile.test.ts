/** @vitest-environment jsdom */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

const stubMatchMedia = (matches: boolean) => {
  const listeners = new Set<() => void>();
  const state = { matches };
  vi.stubGlobal(
    'matchMedia',
    (query: string): MediaQueryList =>
      ({
        get matches() {
          return state.matches;
        },
        media: query,
        addEventListener: (_: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) =>
          listeners.delete(listener),
      }) as unknown as MediaQueryList
  );
  return (next: boolean) => {
    state.matches = next;
    listeners.forEach((listener) => listener());
  };
};

describe('useIsMobile', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('reflects the current viewport', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates when the viewport crosses the breakpoint', () => {
    const setMatches = stubMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => setMatches(true));
    expect(result.current).toBe(true);
  });
});
