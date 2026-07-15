import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImportDraftSummary } from '@ploutizo/types';
import { ImportDraftList } from './ImportDraftList';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params?: { draftId?: string };
  }) => (
    <a href={params?.draftId ? to.replace('$draftId', params.draftId) : to}>
      {children}
    </a>
  ),
}));

vi.mock('@ploutizo/ui/components/loading-button', () => ({
  LoadingButton: ({
    children,
    loading,
    disabled,
    ...props
  }: React.ComponentProps<'button'> & { loading?: boolean }) => (
    <button {...props} disabled={loading || disabled}>
      {children}
    </button>
  ),
}));

const draftSummary: ImportDraftSummary = {
  id: 'draft_1',
  accountId: 'acct_1',
  accountName: 'Visa',
  accountInstitution: 'TD',
  accountLastFour: '1234',
  source: 'ploutizo_normalized',
  status: 'draft',
  fileName: 'statement.csv',
  rowCount: 2,
  validRowCount: 1,
  invalidRowCount: 1,
  importedAt: '2026-05-20T12:00:00.000Z',
  completedAt: null,
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-20T12:00:00.000Z',
};

describe('ImportDraftList', () => {
  it('shows the empty state when there are no active drafts', () => {
    render(
      <ImportDraftList
        drafts={[]}
        discardingDraftId={undefined}
        isDiscarding={false}
        onDiscard={vi.fn()}
      />
    );

    expect(screen.getByText('No active drafts.')).toBeInTheDocument();
  });

  it('renders draft cards when drafts exist', () => {
    render(
      <ImportDraftList
        drafts={[draftSummary]}
        discardingDraftId={undefined}
        isDiscarding={false}
        onDiscard={vi.fn()}
      />
    );

    expect(screen.queryByText('No active drafts.')).not.toBeInTheDocument();
    expect(screen.getByText('statement.csv')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue/i })).toHaveAttribute(
      'href',
      '/transactions/import/draft_1'
    );
  });
});
