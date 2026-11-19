import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { OfflineIndicator } from './OfflineIndicator';
import { OfflineUnavailable } from './OfflineUnavailable';
import {
  ingestSuccessfulQuery,
  resetOfflineReadStore,
} from './offline-read-store';

describe('offline indicator', () => {
  beforeEach(() => {
    resetOfflineReadStore();
  });

  it('shows the last time dashboard data was saved', () => {
    ingestSuccessfulQuery(
      ['dashboard-overview', 'all'],
      { meta: { kind: 'all', range: null }, trend: [], categories: [] },
      '2026-11-19T15:04:00.000Z'
    );

    render(<OfflineIndicator />);

    expect(screen.getByRole('status').textContent).toMatch(
      /^Offline - data as of /
    );
  });

  it('says nothing is saved when this device has no snapshot', () => {
    render(<OfflineIndicator />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Offline - nothing saved on this device yet'
    );
  });

  it('shows a not-available empty state instead of an error', () => {
    render(<OfflineUnavailable />);

    expect(screen.getByText('Not available offline')).toBeTruthy();
    expect(
      screen.getByText(/hasn't been opened on this device yet/)
    ).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
