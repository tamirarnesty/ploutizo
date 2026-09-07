import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportPreparedConfirmation } from '@ploutizo/types';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import { ImportFinalize, preparedNotFoundRedirect } from './ImportFinalize';

const finalizeMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  shouldBlockFn: undefined as
    | ((args: {
        current: { pathname: string };
        next: { pathname: string };
      }) => boolean | Promise<boolean>)
    | undefined,
  prepared: {
    data: undefined as ImportPreparedConfirmation | undefined,
    isLoading: false,
    isError: false,
    error: null as unknown,
  },
  draft: {
    data: undefined as ReturnType<typeof makeImportDraft> | undefined,
    isLoading: false,
    isError: false,
  },
  invalidate: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  finalize: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => finalizeMocks.navigate,
  useBlocker: ({
    shouldBlockFn,
  }: {
    shouldBlockFn: (args: {
      current: { pathname: string };
      next: { pathname: string };
    }) => boolean | Promise<boolean>;
  }) => {
    finalizeMocks.shouldBlockFn = shouldBlockFn;
  },
}));

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    success: finalizeMocks.toastSuccess,
  },
}));

vi.mock('@/lib/data-access/imports/useGetPreparedImport', () => ({
  useGetPreparedImport: () => finalizeMocks.prepared,
}));

vi.mock('@/lib/data-access/imports/useGetImportDraft', () => ({
  useGetImportDraft: () => finalizeMocks.draft,
}));

vi.mock('@/lib/data-access/imports/useInvalidatePreparedImport', () => ({
  useInvalidatePreparedImport: () => finalizeMocks.invalidate,
}));

vi.mock('@/lib/data-access/imports/useFinalizeImportDraft', () => ({
  useFinalizeImportDraft: () => finalizeMocks.finalize,
}));

const reviewedValues = {
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
  externalId: null,
  rawDescription: 'Coffee',
  selectedForImport: true,
};

const confirmation: ImportPreparedConfirmation = {
  id: 'prep_1',
  batchId: 'draft_1',
  revision: 1,
  createdAt: '2026-05-20T12:00:00.000Z',
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
      reviewedValues,
    },
  ],
  matched: [
    {
      batchRowId: 'row_2',
      outcome: 'matched',
      transactionId: 'txn_1',
      reviewedValues: {
        ...reviewedValues,
        description: 'Lunch',
      },
    },
  ],
};

const completedResult = {
  id: 'batch_1',
  account: confirmation.created[0]
    ? {
        id: 'acct_1',
        name: 'Visa',
        institutionId: 'td',
        lastFour: '1234',
      }
    : {
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
  preparedSetId: 'prep_1',
};

describe('preparedNotFoundRedirect', () => {
  it('sends missing staging back to Review import', () => {
    expect(
      preparedNotFoundRedirect({
        error: {
          code: 'NOT_FOUND',
          message: 'Prepared import set not found.',
        },
      })
    ).toBe('review');
  });

  it('sends a missing or completed draft to the Import hub', () => {
    expect(
      preparedNotFoundRedirect({
        error: { code: 'NOT_FOUND', message: 'Import draft not found.' },
      })
    ).toBe('hub');
  });
});

describe('ImportFinalize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    finalizeMocks.shouldBlockFn = undefined;
    finalizeMocks.prepared = {
      data: confirmation,
      isLoading: false,
      isError: false,
      error: null,
    };
    finalizeMocks.draft = {
      data: makeImportDraft({
        rows: [makeImportDraftRow({ selectedForImport: true })],
      }),
      isLoading: false,
      isError: false,
    };
    finalizeMocks.invalidate.mutateAsync.mockResolvedValue(undefined);
    finalizeMocks.invalidate.isPending = false;
    finalizeMocks.finalize.mutateAsync.mockResolvedValue(completedResult);
    finalizeMocks.finalize.isPending = false;
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
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Finalize import' })
    ).toBeEnabled();
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
      preparedSetId: 'prep_1',
    });

    finalizeMocks.finalize.isPending = true;
    rerender(<ImportFinalize draftId="draft_1" />);

    expect(screen.getByRole('button', { name: /Finalizing/ })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Back to Review' })
    ).toBeDisabled();
    release(completedResult);
  });

  it('invalidates prepared staging before returning to Review import', async () => {
    const user = userEvent.setup();
    render(<ImportFinalize draftId="draft_1" />);

    await user.click(screen.getByRole('button', { name: 'Back to Review' }));

    await waitFor(() =>
      expect(finalizeMocks.invalidate.mutateAsync).toHaveBeenCalledTimes(1)
    );
    expect(finalizeMocks.navigate).toHaveBeenCalledWith({
      to: '/transactions/import/$draftId',
      params: { draftId: 'draft_1' },
      ignoreBlocker: true,
    });
  });

  it('invalidates prepared staging when browser Back returns to Review import', async () => {
    render(<ImportFinalize draftId="draft_1" />);

    await expect(
      finalizeMocks.shouldBlockFn?.({
        current: { pathname: '/transactions/import/draft_1/finalize' },
        next: { pathname: '/transactions/import/draft_1' },
      })
    ).resolves.toBe(false);

    expect(finalizeMocks.invalidate.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('returns stale finalize failures to Review import with affected rows', async () => {
    const user = userEvent.setup();
    finalizeMocks.finalize.mutateAsync.mockRejectedValue({
      error: {
        code: 'IMPORT_FINALIZE_STALE',
        message: 'This prepared import is stale.',
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
      expect(finalizeMocks.navigate).toHaveBeenCalledWith({
        to: '/transactions/import/$draftId',
        params: { draftId: 'draft_1' },
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
    expect(finalizeMocks.navigate).not.toHaveBeenCalled();

    finalizeMocks.finalize.mutateAsync.mockResolvedValue(completedResult);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(finalizeMocks.finalize.mutateAsync).toHaveBeenCalledTimes(2);
  });

  it('redirects a successful finalize to the Import hub with a view-transactions toast', async () => {
    const user = userEvent.setup();
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
    expect(finalizeMocks.navigate).toHaveBeenCalledWith({
      to: '/transactions/import',
      ignoreBlocker: true,
    });

    const toastArg = finalizeMocks.toastSuccess.mock.calls[0]?.[1] as {
      action?: { onClick?: () => void };
    };
    toastArg.action?.onClick?.();
    expect(finalizeMocks.navigate).toHaveBeenCalledWith({
      to: '/transactions',
      search: { importBatchId: 'batch_1', importOutcome: 'created' },
    });
  });

  it('redirects missing staging to Review import with a prepare-again message', async () => {
    finalizeMocks.prepared = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: {
        error: {
          code: 'NOT_FOUND',
          message: 'Prepared import set not found.',
        },
      },
    };

    render(<ImportFinalize draftId="draft_1" />);

    await waitFor(() =>
      expect(finalizeMocks.navigate).toHaveBeenCalledWith({
        to: '/transactions/import/$draftId',
        params: { draftId: 'draft_1' },
        state: { importReview: { prepareAgain: true } },
      })
    );
  });

  it('redirects a completed batch to the Import hub', async () => {
    finalizeMocks.prepared = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: {
        error: {
          code: 'NOT_FOUND',
          message: 'Import draft not found.',
        },
      },
    };

    render(<ImportFinalize draftId="draft_1" />);

    await waitFor(() =>
      expect(finalizeMocks.navigate).toHaveBeenCalledWith({
        to: '/transactions/import',
      })
    );
  });
});
