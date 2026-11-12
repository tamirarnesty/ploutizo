import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOptimisticSelection } from './useOptimisticSelection';

/** An `onChange` whose navigation settles only when the test says so. */
const deferredOnChange = () => {
  const settles: (() => void)[] = [];
  const onChange = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        settles.push(resolve);
      })
  );
  return { onChange, settle: (index: number) => settles[index]() };
};

describe('useOptimisticSelection', () => {
  it('shows a toggle immediately and settles on the committed values', async () => {
    const { onChange, settle } = deferredOnChange();
    const { result, rerender } = renderHook(
      ({ values }) => useOptimisticSelection(values, onChange),
      { initialProps: { values: [] as string[] } }
    );

    act(() => result.current.toggle('a'));
    expect(result.current.selected).toEqual(['a']);
    expect(onChange).toHaveBeenLastCalledWith(['a']);

    // The URL catches up, then the navigation promise resolves.
    rerender({ values: ['a'] });
    await act(() => Promise.resolve(settle(0)));
    expect(result.current.selected).toEqual(['a']);
  });

  it('keeps rapid toggles while an earlier navigation lands first', async () => {
    const { onChange, settle } = deferredOnChange();
    const { result, rerender } = renderHook(
      ({ values }) => useOptimisticSelection(values, onChange),
      { initialProps: { values: [] as string[] } }
    );

    act(() => result.current.toggle('a'));
    act(() => result.current.toggle('b'));
    expect(result.current.selected).toEqual(['a', 'b']);

    // The URL reflects only the first toggle; the second is still in flight.
    rerender({ values: ['a'] });
    await act(() => Promise.resolve(settle(0)));
    expect(result.current.selected).toEqual(['a', 'b']);

    // A third toggle builds on the in-flight selection, not the stale URL.
    act(() => result.current.toggle('c'));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b', 'c']);

    rerender({ values: ['a', 'b', 'c'] });
    await act(() => {
      settle(1);
      settle(2);
      return Promise.resolve();
    });
    expect(result.current.selected).toEqual(['a', 'b', 'c']);
  });

  it('reverts to the committed values when navigation settles without applying', async () => {
    const { onChange, settle } = deferredOnChange();
    const { result } = renderHook(() =>
      useOptimisticSelection(['a'], onChange)
    );

    act(() => result.current.toggle('b'));
    expect(result.current.selected).toEqual(['a', 'b']);
    await act(() => Promise.resolve(settle(0)));
    expect(result.current.selected).toEqual(['a']);
  });

  it('clears the selection in one commit', () => {
    const { onChange } = deferredOnChange();
    const { result } = renderHook(() =>
      useOptimisticSelection(['a', 'b'], onChange)
    );

    act(() => result.current.commit([]));
    expect(result.current.selected).toEqual([]);
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
