import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportHistoryItem } from '@ploutizo/types';
import { useGetImportHistoryInfinite } from '@/lib/data-access/imports';
import { ImportHistoryPage } from './ImportHistoryPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
  }: {
    children: React.ReactNode;
    to: string;
    search?: Record<string, string>;
  }) => {
    const href = search
      ? `${to}?${new URLSearchParams(search).toString()}`
      : to;
    return <a href={href}>{children}</a>;
  },
}));

vi.mock('@ploutizo/ui/components/loading-button', () => ({
  LoadingButton: ({
    children,
    loading,
    disabled,
    loadingText: _loadingText,
    ...props
  }: React.ComponentProps<'button'> & {
    loading?: boolean;
    loadingText?: string;
  }) => (
    <button {...props} disabled={loading || disabled}>
      {loading ? 'Loading ' : null}
      {children}
    </button>
  ),
}));

vi.mock('@/lib/data-access/imports', () => ({
  useGetImportHistoryInfinite: vi.fn(),
}));

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

describe('ImportHistoryPage', () => {
  beforeEach(() => {
    vi.mocked(useGetImportHistoryInfinite).mockReset();
  });

  it('renders paginated history and loads the next page', async () => {
    const user = userEvent.setup();
    const fetchNextPage = vi.fn();
    vi.mocked(useGetImportHistoryInfinite).mockReturnValue({
      data: {
        pages: [{ data: [completedItem], nextCursor: 'cursor_2' }],
      },
      isLoading: false,
      isError: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    } as never);

    render(<ImportHistoryPage />);

    expect(
      screen.getByRole('heading', { name: 'Import history' })
    ).toBeInTheDocument();
    expect(screen.getByText('statement.csv')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View created' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('hides Load more when there is no next page and includes discarded entries', () => {
    vi.mocked(useGetImportHistoryInfinite).mockReturnValue({
      data: {
        pages: [
          { data: [completedItem], nextCursor: 'cursor_2' },
          { data: [discardedItem], nextCursor: null },
        ],
      },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    } as never);

    render(<ImportHistoryPage />);

    expect(screen.getByText('statement.csv')).toBeInTheDocument();
    expect(screen.getByText('old.csv')).toBeInTheDocument();
    expect(screen.getByText('Discarded')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Load more' })
    ).not.toBeInTheDocument();
  });
});
