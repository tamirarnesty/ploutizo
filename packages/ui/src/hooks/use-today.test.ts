/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToday } from './use-today';

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 23, 59, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns local midnight of the current day', () => {
    const { result } = renderHook(() => useToday());
    expect(result.current).toEqual(new Date(2026, 10, 9));
  });

  it('keeps a stable reference within a day', () => {
    const { result, rerender } = renderHook(() => useToday());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('rolls over at local midnight', () => {
    const { result } = renderHook(() => useToday());
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current).toEqual(new Date(2026, 10, 10));
  });

  it('re-checks when the tab becomes visible again', () => {
    const { result } = renderHook(() => useToday());
    // Simulate a sleeping tab: the clock moved on but no timer fired.
    vi.setSystemTime(new Date(2026, 10, 12, 8, 0, 0));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toEqual(new Date(2026, 10, 12));
  });
});
