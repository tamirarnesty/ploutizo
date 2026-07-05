import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ImportDraftSummary } from '@ploutizo/types';
import { ImportHistoryList } from './ImportHistoryList';

const historyItem: ImportDraftSummary = {
  id: 'batch_1',
  accountId: 'acct_1',
  accountName: 'Visa',
  accountInstitution: 'TD',
  accountLastFour: '1234',
  source: 'ploutizo_normalized',
  status: 'completed',
  fileName: 'statement.csv',
  rowCount: 10,
  validRowCount: 10,
  invalidRowCount: 0,
  importedAt: '2026-05-20T12:00:00.000Z',
  completedAt: '2026-05-21T12:00:00.000Z',
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-21T12:00:00.000Z',
};

describe('ImportHistoryList', () => {
  it('shows the empty state when there is no import history', () => {
    render(<ImportHistoryList history={[]} />);

    expect(screen.getByText('No recent import history.')).toBeInTheDocument();
  });

  it('renders history items when history exists', () => {
    render(<ImportHistoryList history={[historyItem]} />);

    expect(
      screen.queryByText('No recent import history.')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('10 rows')).toBeInTheDocument();
  });
});
