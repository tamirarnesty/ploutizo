import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TRANSACTION_SEARCH_DEBOUNCE_MS } from '../transactionSearch';
import { useDebouncedTransactionSearch } from './useDebouncedTransactionSearch';

const commitDelay = () => {
  act(() => {
    vi.advanceTimersByTime(TRANSACTION_SEARCH_DEBOUNCE_MS);
  });
};

const renderSearch = (urlQuery: string, onCommit = vi.fn()) => {
  const rendered = renderHook(
    ({ url }: { url: string }) =>
      useDebouncedTransactionSearch({ urlQuery: url, onCommit }),
    { initialProps: { url: urlQuery } }
  );
  return { ...rendered, onCommit };
};

describe('useDebouncedTransactionSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows each keystroke immediately and commits the trimmed query', () => {
    const { result, onCommit } = renderSearch('');

    act(() => {
      result.current.setQuery('cat ');
    });

    expect(result.current.query).toBe('cat ');
    expect(onCommit).not.toHaveBeenCalled();

    commitDelay();

    expect(onCommit).toHaveBeenCalledExactlyOnceWith('cat');
  });

  it('commits only the latest value after a burst of typing', () => {
    const { result, onCommit } = renderSearch('');

    for (const value of ['c', 'ca', 'cat']) {
      act(() => {
        result.current.setQuery(value);
      });
      act(() => {
        vi.advanceTimersByTime(TRANSACTION_SEARCH_DEBOUNCE_MS - 1);
      });
    }
    commitDelay();

    expect(onCommit).toHaveBeenCalledExactlyOnceWith('cat');
  });

  it('keeps in-progress typing when an earlier commit echoes back', () => {
    const { result, rerender, onCommit } = renderSearch('');

    act(() => {
      result.current.setQuery('ca');
    });
    commitDelay();
    act(() => {
      result.current.setQuery('cat');
    });
    rerender({ url: 'ca' });

    expect(result.current.query).toBe('cat');
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('ca');
  });

  it('keeps a trailing space when the trimmed query lands in the URL', () => {
    const { result, rerender } = renderSearch('');

    act(() => {
      result.current.setQuery('cat ');
    });
    commitDelay();
    rerender({ url: 'cat' });

    expect(result.current.query).toBe('cat ');
  });

  it('does not commit when the trimmed draft already matches the URL', () => {
    const { result, onCommit } = renderSearch('cat');

    act(() => {
      result.current.setQuery('cat ');
    });
    commitDelay();
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      result.current.setQuery('dog');
    });
    commitDelay();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('dog');
  });

  it('drops a pending commit when the field unmounts', () => {
    const { result, unmount, onCommit } = renderSearch('');

    act(() => {
      result.current.setQuery('cat');
    });
    unmount();
    commitDelay();

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('drops the draft and pending commit when the URL query changes externally', () => {
    const { result, rerender, onCommit } = renderSearch('');

    act(() => {
      result.current.setQuery('cat');
    });
    rerender({ url: 'dog' });

    expect(result.current.query).toBe('dog');
    commitDelay();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('drops a newer draft when the URL changes to something other than the commit echo', () => {
    const { result, rerender, onCommit } = renderSearch('');

    act(() => {
      result.current.setQuery('ca');
    });
    commitDelay();
    act(() => {
      result.current.setQuery('cat');
    });
    rerender({ url: 'dog' });

    expect(result.current.query).toBe('dog');
    commitDelay();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('ca');
  });

  it('commits typing that starts after an external URL change', () => {
    const { result, rerender, onCommit } = renderSearch('cat');

    rerender({ url: 'dog' });
    act(() => {
      result.current.setQuery('dogs');
    });
    commitDelay();

    expect(result.current.query).toBe('dogs');
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('dogs');
  });

  it('commits clearing the field while an earlier commit is still in flight', () => {
    const { result, rerender, onCommit } = renderSearch('');

    act(() => {
      result.current.setQuery('ca');
    });
    commitDelay();
    act(() => {
      result.current.setQuery('');
    });
    commitDelay();
    rerender({ url: 'ca' });

    expect(onCommit).toHaveBeenNthCalledWith(2, '');
    expect(result.current.query).toBe('');
  });

  it('keeps typing when the URL echoes an older of two in-flight commits', () => {
    const { result, rerender, onCommit } = renderSearch('');

    act(() => {
      result.current.setQuery('ca');
    });
    commitDelay();
    act(() => {
      result.current.setQuery('cat');
    });
    commitDelay();
    rerender({ url: 'ca' });

    expect(result.current.query).toBe('cat');
    rerender({ url: 'cat' });
    expect(result.current.query).toBe('cat');
    expect(onCommit.mock.calls).toEqual([['ca'], ['cat']]);
  });
});
