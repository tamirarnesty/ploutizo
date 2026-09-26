import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportFinalizePreview } from '@ploutizo/types';
import {
  importDraftReviewPathname,
  importDraftReviewRoute,
} from '@/lib/navigation';
import {
  clearImportFinalizePreviewSession,
  getImportFinalizePreviewSession,
  setImportFinalizePreviewSession,
} from '@/lib/data-access/imports/importFinalizePreviewSession';
import { resetRouterMocks, routerMocks } from '@/test/mockTanstackRouter';
import { useGetImportDraft } from '@/lib/data-access/imports/useGetImportDraft';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import { ImportFinalize, importDraftNotFoundRedirect } from './ImportFinalize';

const finalizeMocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  draft: {
    data: undefined as ReturnType<typeof makeImportDraft> | undefined,
    isLoading: false,
    isError: false,
  },
  finalize: {
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
  },
}));

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    success: finalizeMocks.toastSuccess,
  },
}));

vi.mock('@/lib/data-access/imports/useGetImportDraft', () => ({
  useGetImportDraft: vi.fn(() => finalizeMocks.draft),
}));

vi.mock('@/lib/data-access/imports/useFinalizeImportDraft', () => ({
  useFinalizeImportDraft: () => finalizeMocks.finalize,
}));

const snapshot = {
  reviewedValues: {
    date: '2026-05-02',
    amount: 4218,
    type: 'expense' as const,
    description: 'Coffee',
    categoryId: 'cat_1',
    assigneeMemberIds: ['member_1'],
    counterpartAccountId: null,
    refundOf: null,
    refundOfBatchRowId: null,
    notes: null,
    tagIds: [] as string[],
  },
  provenance: {
    externalId: null,
    rawDescription: 'Coffee',
    parsedDescription: 'Coffee',
  },
};

const preview: ImportFinalizePreview = {
  batchId: 'draft_1',
  rowCount: 4,
  counts: {
    created: 1,
    matched: 1,
    skipped: 1,
    invalid: 1,
  },
  created: [
    {
      batchRowId: 'row_1',
      outcome: 'created',
      transactionId: null,
      snapshot,
    },
  ],
  matched: [
    {
      batchRowId: 'row_2',
      outcome: 'matched',
      transactionId: 'txn_1',
      snapshot: {
        ...snapshot,
        reviewedValues: {
          ...snapshot.reviewedValues,
          description: 'Lunch',
        },
      },
    },
  ],
};

const rowIds = ['row_1', 'row_2'];

const completedResult = {
  id: 'batch_1',
  account: {
    id: 'acct_1',
    name: 'Visa',
    institutionId: 'td',
    lastFour: '1234',
  },
  contentProfileId: null,
  status: 'completed' as const,
  fileName: 'statement.csv',
  rowCount: 4,
  createdCount: 1,
  matchedCount: 1,
  skippedCount: 1,
  invalidCount: 1,
  importedAt: '2026-05-20T12:00:00.000Z',
  completedAt: '2026-05-21T12:00:00.000Z',
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-21T12:00:00.000Z',
};

describe('importDraftNotFoundRedirect', () => {
  it('sends a missing draft to the Import hub', () => {
    expect(
      importDraftNotFoundRedirect({
        error: { code: 'NOT_FOUND', message: 'Import draft not found.' },
      })
    ).toBe('hub');
  });

  it('returns null for other not-found messages', () => {
    expect(
      importDraftNotFoundRedirect({
        error: { code: 'NOT_FOUND', message: 'Something else.' },
      })
    ).toBe(null);
  });
});

describe('ImportFinalize', () => {
  beforeEach(() => {
    resetRouterMocks();
    vi.clearAllMocks();
    clearImportFinalizePreviewSession('draft_1');
    setImportFinalizePreviewSession('draft_1', { rowIds, preview });
    finalizeMocks.draft = {
      data: makeImportDraft({
        rows: [makeImportDraftRow({ selectedForImport: true })],
      }),
      isLoading: false,
      isError: false,
    };
    finalizeMocks.finalize.mutateAsync.mockResolvedValue(completedResult);
    finalizeMocks.finalize.isPending = false;
    finalizeMocks.finalize.isSuccess = false;
  });

  it('renders a read-only confirmation with reconciling counts', () => {
    render(<ImportFinalize draftId="draft_1" />);

    expect(
      screen.getByText(
        'Created 1 · Matched 1 · Skipped 1 · Invalid 1 · 4 of 4 source rows'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Will create' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Already matched' })
    ).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Finalize import' })
    ).toBeEnabled();
  });

  it('keeps a long account name readable by wrapping', () => {
    finalizeMocks.draft = {
      data: makeImportDraft({
        account: {
          id: 'acct_1',
          name: 'Joint Everyday Rewards Visa Infinite Privilege',
          institutionId: 'td',
          lastFour: '1234',
        },
        rows: [makeImportDraftRow({ selectedForImport: true })],
      }),
      isLoading: false,
      isError: false,
    };

    render(<ImportFinalize draftId="draft_1" />);

    const heading = screen.getByRole('heading', {
      name: 'Joint Everyday Rewards Visa Infinite Privilege · TD · ••1234',
    });
    expect(heading).toHaveClass('wrap-break-word');
    expect(heading).not.toHaveClass('truncate');
  });

  it('uses direct recovery copy when finalizing fails without a message', async () => {
    const user = userEvent.setup();
    finalizeMocks.finalize.mutateAsync.mockRejectedValueOnce({
      error: { code: 'UNKNOWN' },
    });

    render(<ImportFinalize draftId="draft_1" />);
    await user.click(screen.getByRole('button', { name: 'Finalize import' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not finalize this import. Please retry.'
      )
    );
  });

  it('disables Finalize import and shows loading after the first click', async () => {
    const user = userEvent.setup();
    let release!: (value: typeof completedResult) => void;
    finalizeMocks.finalize.mutateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );

    const { rerender } = render(<ImportFinalize draftId="draft_1" />);
    await user.click(screen.getByRole('button', { name: 'Finalize import' }));

    expect(finalizeMocks.finalize.mutateAsync).toHaveBeenCalledWith({
      rowIds,
    });

    finalizeMocks.finalize.isPending = true;
    rerender(<ImportFinalize draftId="draft_1" />);

    expect(screen.getByRole('button', { name: /Finalizing/ })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Back to Review' })
    ).toBeDisabled();
    release(completedResult);
  });

  it('unsubscribes from the draft GET while finalize is pending or succeeded', () => {
    const { rerender } = render(<ImportFinalize draftId="draft_1" />);

    expect(useGetImportDraft).toHaveBeenCalledWith('draft_1', {
      enabled: true,
    });

    finalizeMocks.finalize.isPending = true;
    rerender(<ImportFinalize draftId="draft_1" />);
    expect(useGetImportDraft).toHaveBeenLastCalledWith('draft_1', {
      enabled: false,
    });

    finalizeMocks.finalize.isPending = false;
    finalizeMocks.finalize.isSuccess = true;
    rerender(<ImportFinalize draftId="draft_1" />);
    expect(useGetImportDraft).toHaveBeenLastCalledWith('draft_1', {
      enabled: false,
    });
  });

  it('returns to Review import when Back to Review is clicked', async () => {
    const user = userEvent.setup();
    render(<ImportFinalize draftId="draft_1" />);

    await user.click(screen.getByRole('button', { name: 'Back to Review' }));

    await waitFor(() =>
      expect(routerMocks.navigate).toHaveBeenCalledWith({
        ...importDraftReviewRoute('draft_1'),
        ignoreBlocker: true,
        state: { importReview: { prepareAgain: true } },
      })
    );
  });

  it('clears preview when browser Back returns to Review import', async () => {
    render(<ImportFinalize draftId="draft_1" />);

    await expect(
      routerMocks.shouldBlockFn?.({
        current: { pathname: '/import/draft_1/finalize' },
        next: { pathname: importDraftReviewPathname('draft_1') },
      })
    ).resolves.toBe(false);

    expect(getImportFinalizePreviewSession('draft_1')).toBeUndefined();
  });

  it('returns finalize requirement failures to Review import with affected rows', async () => {
    const user = userEvent.setup();
    finalizeMocks.finalize.mutateAsync.mockRejectedValue({
      error: {
        code: 'IMPORT_FINALIZE_NOT_READY',
        message: 'Category is required.',
        details: {
          rows: [
            {
              batchRowId: 'row_needs_review',
              key: 'transaction.category.required',
            },
          ],
        },
      },
    });

    render(<ImportFinalize draftId="draft_1" />);
    await user.click(screen.getByRole('button', { name: 'Finalize import' }));

    await waitFor(() =>
      expect(routerMocks.navigate).toHaveBeenCalledWith({
        ...importDraftReviewRoute('draft_1'),
        state: {
          importReview: {
            issues: [
              {
                batchRowId: 'row_needs_review',
                key: 'transaction.category.required',
              },
            ],
          },
        },
      })
    );
  });

  it('stays on Finalize with Retry after an uncertain transport failure', async () => {
    const user = userEvent.setup();
    finalizeMocks.finalize.mutateAsync.mockRejectedValueOnce({
      error: { code: 'UNKNOWN', message: 'The connection dropped.' },
    });

    render(<ImportFinalize draftId="draft_1" />);
    await user.click(screen.getByRole('button', { name: 'Finalize import' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The connection dropped.'
    );
    expect(routerMocks.navigate).not.toHaveBeenCalled();

    finalizeMocks.finalize.mutateAsync.mockResolvedValue(completedResult);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(finalizeMocks.finalize.mutateAsync).toHaveBeenCalledTimes(2);
  });

  it('redirects a successful finalize to the Import hub with a view-transactions toast', async () => {
    const user = userEvent.setup();
    finalizeMocks.finalize.mutateAsync.mockImplementation(async () => {
      clearImportFinalizePreviewSession('draft_1');
      return completedResult;
    });
    render(<ImportFinalize draftId="draft_1" />);

    await user.click(screen.getByRole('button', { name: 'Finalize import' }));

    await waitFor(() =>
      expect(finalizeMocks.toastSuccess).toHaveBeenCalledWith(
        'Import completed.',
        expect.objectContaining({
          action: expect.objectContaining({ label: 'View transactions' }),
        })
      )
    );
    expect(routerMocks.navigate).toHaveBeenCalledWith({
      to: '/import',
      ignoreBlocker: true,
    });
    expect(routerMocks.navigate).not.toHaveBeenCalledWith(
      expect.objectContaining(importDraftReviewRoute('draft_1'))
    );

    const toastArg = finalizeMocks.toastSuccess.mock.calls[0]?.[1] as {
      action?: { onClick?: () => void };
    };
    toastArg.action?.onClick?.();
    expect(routerMocks.navigate).toHaveBeenCalledWith({
      to: '/transactions',
      search: { importBatchId: 'batch_1', importOutcome: 'created' },
    });
  });

  it('redirects a completed batch to the Import hub on finalize not-found', async () => {
    const user = userEvent.setup();
    finalizeMocks.finalize.mutateAsync.mockRejectedValue({
      error: {
        code: 'NOT_FOUND',
        message: 'Import draft not found.',
      },
    });

    render(<ImportFinalize draftId="draft_1" />);
    await user.click(screen.getByRole('button', { name: 'Finalize import' }));

    await waitFor(() =>
      expect(routerMocks.navigate).toHaveBeenCalledWith({
        to: '/import',
        ignoreBlocker: true,
      })
    );
  });
});
