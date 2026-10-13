import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TRANSACTION_SEARCH_COMMIT_DELAY_MS,
  useDebouncedTransactionSearch,
} from './useDebouncedTransactionSearch';

const commitDelay = () => {
  act(() => {
    vi.advanceTimersByTime(TRANSACTION_SEARCH_COMMIT_DELAY_MS);
  });
};

describe('useDebouncedTransactionSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows each keystroke immediately and commits the trimmed query', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedTransactionSearch({ urlQuery: '', onCommit })
    );

    act(() => {
      result.current.setQuery('cat ');
    });

    expect(result.current.query).toBe('cat ');
    expect(onCommit).not.toHaveBeenCalled();

    commitDelay();

    expect(onCommit).toHaveBeenCalledExactlyOnceWith('cat');
  });

  it('keeps in-progress typing when the committed URL echoes back', () => {
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(
      ({ urlQuery }: { urlQuery: string }) =>
        useDebouncedTransactionSearch({ urlQuery, onCommit }),
      { initialProps: { urlQuery: '' } }
    );

    act(() => {
      result.current.setQuery('ca');
    });
    commitDelay();
    act(() => {
      result.current.setQuery('cat');
    });
    rerender({ urlQuery: 'ca' });

    expect(result.current.query).toBe('cat');
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('ca');
  });

  it('keeps a trailing space when the trimmed query lands in the URL', () => {
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(
      ({ urlQuery }: { urlQuery: string }) =>
        useDebouncedTransactionSearch({ urlQuery, onCommit }),
      { initialProps: { urlQuery: '' } }
    );

    act(() => {
      result.current.setQuery('cat ');
    });
    commitDelay();
    rerender({ urlQuery: 'cat' });

    expect(result.current.query).toBe('cat ');
  });

  it('adopts a later external navigation to a query that was previously committed', () => {
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(
      ({ urlQuery }: { urlQuery: string }) =>
        useDebouncedTransactionSearch({ urlQuery, onCommit }),
      { initialProps: { urlQuery: '' } }
    );

    act(() => {
      result.current.setQuery('dog');
    });
    commitDelay();
    rerender({ urlQuery: 'dog' });

    rerender({ urlQuery: 'rent' });
    expect(result.current.query).toBe('rent');

    rerender({ urlQuery: 'dog' });
    expect(result.current.query).toBe('dog');
  });

  it('adopts an external URL change and drops the uncommitted query', () => {
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(
      ({ urlQuery }: { urlQuery: string }) =>
        useDebouncedTransactionSearch({ urlQuery, onCommit }),
      { initialProps: { urlQuery: 'rent' } }
    );

    act(() => {
      result.current.setQuery('dog');
    });
    rerender({ urlQuery: '' });
    commitDelay();

    expect(result.current.query).toBe('');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('does not commit when the trimmed draft already matches the URL', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedTransactionSearch({ urlQuery: 'cat', onCommit })
    );

    act(() => {
      result.current.setQuery('cat');
    });
    commitDelay();

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('clears the draft and cancels a pending commit', () => {
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(
      ({ urlQuery }: { urlQuery: string }) =>
        useDebouncedTransactionSearch({ urlQuery, onCommit }),
      { initialProps: { urlQuery: 'cat' } }
    );

    act(() => {
      result.current.setQuery('dog');
      result.current.resetDraft();
    });
    rerender({ urlQuery: '' });
    commitDelay();

    expect(result.current.query).toBe('');
    expect(onCommit).not.toHaveBeenCalled();
  });
});
