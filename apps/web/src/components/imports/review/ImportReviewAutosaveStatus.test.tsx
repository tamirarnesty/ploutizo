import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportReviewAutosaveStatus } from './ImportReviewAutosaveStatus';

describe('ImportReviewAutosaveStatus', () => {
  it('shows a brief saved acknowledgment then clears', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <ImportReviewAutosaveStatus status="saving" onRetryAutosave={vi.fn()} />
    );

    expect(screen.getByText('Saving…')).toBeInTheDocument();

    rerender(
      <ImportReviewAutosaveStatus status="saved" onRetryAutosave={vi.fn()} />
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Saved')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
