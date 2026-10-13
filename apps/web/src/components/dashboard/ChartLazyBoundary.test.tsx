import { render, screen, waitFor } from '@testing-library/react';
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
  it('renders the chart after a failed load is retried', async () => {
    const user = userEvent.setup();
    let loadAttempts = 0;
    const load = vi.fn(async () => {
      loadAttempts += 1;
      if (loadAttempts === 1) {
        throw new Error('chunk failed');
      }
      return {
        default: () => <span>Chart loaded</span>,
      };
    });

    render(
      <ChartLazyBoundary label="test chart" load={load}>
        {(Chart) => <Chart />}
      </ChartLazyBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load test chart/)).toBeInTheDocument();
    });
    expect(load).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('Chart loaded')).toBeInTheDocument();
    });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
