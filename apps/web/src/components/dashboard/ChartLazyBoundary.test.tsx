import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChartLazyBoundary, ChartLazyErrorFallback } from './ChartLazyBoundary';

describe('ChartLazyErrorFallback', () => {
  it('calls onRetry when Try again is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ChartLazyErrorFallback label="test chart" onRetry={onRetry} />);

    expect(screen.getByText(/Couldn't load test chart/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('ChartLazyBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ChartLazyBoundary label="test chart">
        <span>Chart loaded</span>
      </ChartLazyBoundary>
    );

    expect(screen.getByText('Chart loaded')).toBeInTheDocument();
  });
});
