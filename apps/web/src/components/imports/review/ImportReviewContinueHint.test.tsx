import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportReviewContinueHint } from './ImportReviewContinueHint';

describe('ImportReviewContinueHint', () => {
  it('shows a brief saved acknowledgment before returning to the default hint', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <ImportReviewContinueHint
        autosaveStatus="saving"
        continueBlocker={null}
        isContinuing={false}
        onRetryAutosave={vi.fn()}
      />
    );

    expect(screen.getByText('Saving…')).toBeInTheDocument();

    rerender(
      <ImportReviewContinueHint
        autosaveStatus="saved"
        continueBlocker={null}
        isContinuing={false}
        onRetryAutosave={vi.fn()}
      />
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getByText(
        'Continue prepares the selected rows for finalize import.'
      )
    ).toBeInTheDocument();

    vi.useRealTimers();
  });
});
