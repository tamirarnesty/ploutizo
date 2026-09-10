import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useImportReviewTextDraft } from './useImportReviewTextDraft';

describe('useImportReviewTextDraft', () => {
  it('writes the working copy on change without waiting', () => {
    const save = vi.fn();
    const { result } = renderHook(() =>
      useImportReviewTextDraft('Coffee', save, 'row_1')
    );

    act(() => {
      result.current.onChange('Updated coffee');
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('Updated coffee');
    expect(result.current.draft).toBe('Updated coffee');
  });

  it('keeps trailing spaces in chrome without a no-op persist', () => {
    const save = vi.fn();
    const { result } = renderHook(() =>
      useImportReviewTextDraft('Coffee', save, 'row_1')
    );

    act(() => {
      result.current.onFocus();
      result.current.onChange('Coffee ');
    });

    expect(save).not.toHaveBeenCalled();
    expect(result.current.draft).toBe('Coffee ');
  });
});
