import '@/test/mockTanstackRouter';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImportHistoryItem } from '@ploutizo/types';
import { ImportHistoryList } from './ImportHistoryList';

const completedItem: ImportHistoryItem = {
  id: 'batch_1',
  account: {
    id: 'acct_1',
    name: 'Visa',
    institutionId: 'td',
    lastFour: '1234',
  },
  contentProfileId: null,
  status: 'completed',
  fileName: 'statement.csv',
  rowCount: 10,
  createdCount: 6,
  matchedCount: 2,
  skippedCount: 1,
  invalidCount: 1,
  importedAt: '2026-05-20T12:00:00.000Z',
  completedAt: '2026-05-21T12:00:00.000Z',
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-21T12:00:00.000Z',
};

const discardedItem: ImportHistoryItem = {
  id: 'batch_2',
  account: {
    id: 'acct_1',
    name: 'Visa',
    institutionId: 'td',
    lastFour: '1234',
  },
  contentProfileId: null,
  status: 'discarded',
  fileName: 'old.csv',
  rowCount: 4,
  importedAt: '2026-05-18T12:00:00.000Z',
  completedAt: null,
  discardedAt: '2026-05-19T12:00:00.000Z',
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-19T12:00:00.000Z',
};

describe('ImportHistoryList', () => {
  it('shows the empty state when there is no import history', () => {
    render(<ImportHistoryList history={[]} />);

    expect(screen.getByText('No recent import history.')).toBeInTheDocument();
  });

  it('renders compact history items without provenance links', () => {
    render(<ImportHistoryList history={[completedItem]} />);

    expect(
      screen.queryByText('No recent import history.')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('10 rows')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View created' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View matched' })).toBeNull();
  });

  it('keeps long account names and filenames readable by wrapping', () => {
    render(
      <ImportHistoryList
        history={[
          {
            ...completedItem,
            account: {
              ...completedItem.account,
              name: 'Joint Everyday Rewards Visa Infinite Privilege',
            },
            fileName:
              'td-visa-infinite-privilege-statement-january-through-march-2026.csv',
          },
        ]}
      />
    );

    const accountName = screen.getByText(
      'Joint Everyday Rewards Visa Infinite Privilege · TD · ••1234'
    );
    const fileName = screen.getByText(
      'td-visa-infinite-privilege-statement-january-through-march-2026.csv'
    );

    expect(accountName).toHaveClass('wrap-break-word');
    expect(accountName).not.toHaveClass('truncate');
    expect(fileName).toHaveClass('wrap-break-word');
    expect(fileName).not.toHaveClass('truncate');
  });

  it('shows detailed completed counts and provenance links when counts are non-zero', () => {
    render(<ImportHistoryList history={[completedItem]} variant="detailed" />);

    expect(
      screen.getByText('Created 6 · Matched 2 · Skipped 1 · Invalid 1')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View created' })).toHaveAttribute(
      'href',
      '/transactions?importBatchId=batch_1&importOutcome=created'
    );
    expect(screen.getByRole('link', { name: 'View matched' })).toHaveAttribute(
      'href',
      '/transactions?importBatchId=batch_1&importOutcome=matched'
    );
  });

  it('omits provenance links when created or matched counts are zero', () => {
    render(
      <ImportHistoryList
        history={[{ ...completedItem, createdCount: 0, matchedCount: 0 }]}
        variant="detailed"
      />
    );

    expect(screen.queryByRole('link', { name: 'View created' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View matched' })).toBeNull();
  });

  it('shows discarded lifecycle facts without finalized outcome counts', () => {
    render(<ImportHistoryList history={[discardedItem]} variant="detailed" />);

    expect(screen.getByText('Discarded')).toBeInTheDocument();
    expect(screen.getByText('old.csv')).toBeInTheDocument();
    expect(screen.getByText('4 rows')).toBeInTheDocument();
    expect(screen.queryByText(/Created /)).toBeNull();
    expect(screen.queryByRole('link', { name: 'View created' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View matched' })).toBeNull();
  });
});
