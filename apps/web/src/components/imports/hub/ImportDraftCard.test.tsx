import '@/lib/access/working-set-cleanup';
import '@/test/mockTanstackRouter';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportDraftSummary } from '@ploutizo/types';
import { HouseholdHookWrapper } from '@/test/household-hook-harness';
import { expectOverlayMounted } from '@/test/overlayCloseContract';
import { useFinalizeImportDraft } from '@/lib/data-access/imports/useFinalizeImportDraft';
import { fetchFinalizeImportDraft } from '@/lib/data-access/imports/fetchFinalizeImportDraft';
import { ImportDraftCard } from './ImportDraftCard';
import type { ComponentProps } from 'react';

vi.mock('@/lib/access/AccessProvider', async () => {
  const { householdAccessProviderMock } =
    await import('@/test/householdAccessMock');
  return householdAccessProviderMock;
});

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/router', () => ({
  getRouter: () => ({ navigate: vi.fn() }),
}));

vi.mock('@/lib/data-access/imports/fetchFinalizeImportDraft', () => ({
  fetchFinalizeImportDraft: vi.fn(),
}));

vi.mock('@/lib/data-access/imports/releaseImportDraftSession', () => ({
  releaseImportDraftSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/data-access/imports/cancelImportDraftQueryFetches', () => ({
  cancelImportDraftQueryFetches: vi.fn().mockResolvedValue(undefined),
}));

const PendingFinalize = ({ draftId }: { draftId: string }) => {
  const finalize = useFinalizeImportDraft(draftId);
  return (
    <button
      type="button"
      onClick={() => {
        void finalize.mutate({
          rowIds: ['row_1'],
          counts: { created: 1, matched: 0, skipped: 0, invalid: 0 },
        });
      }}
    >
      Start finalize
    </button>
  );
};

const draft: ImportDraftSummary = {
  id: 'draft_1',
  account: {
    id: 'acct_1',
    name: 'Visa',
    institutionId: 'td',
    lastFour: '1234',
  },
  contentProfileId: null,
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

const renderCard = (
  overrides: Partial<ComponentProps<typeof ImportDraftCard>> = {}
) =>
  render(
    <HouseholdHookWrapper>
      <ImportDraftCard
        draft={draft}
        discardingDraftId={undefined}
        isDiscarding={false}
        onDiscard={vi.fn()}
        {...overrides}
      />
    </HouseholdHookWrapper>
  );

describe('ImportDraftCard', () => {
  beforeEach(() => {
    vi.mocked(fetchFinalizeImportDraft).mockReset();
  });
  it('keeps the discard confirmation mounted when closed', () => {
    const { container } = renderCard();

    expectOverlayMounted(container, 'alertDialog');
    expect(
      container.querySelector('[data-slot="alert-dialog"]')
    ).toHaveAttribute('data-open', 'false');
  });

  it('does not discard until the confirmation is accepted', async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    renderCard({ onDiscard });

    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onDiscard).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'Discard draft?' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This will permanently remove this in-progress import and any review work. This action cannot be undone.'
      )
    ).toBeInTheDocument();
  });

  it('leaves the draft in place when discard is canceled', async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    const { container } = renderCard({ onDiscard });

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDiscard).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-slot="alert-dialog"]')
    ).toHaveAttribute('data-open', 'false');
  });

  it('discards the draft when confirmation is accepted', async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    const { container } = renderCard({ onDiscard });

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledWith('draft_1');
    expect(
      container.querySelector('[data-slot="alert-dialog"]')
    ).toHaveAttribute('data-open', 'false');
  });

  it('shows Finalizing… and disables Continue and Discard while finalize is pending', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    vi.mocked(fetchFinalizeImportDraft).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              id: 'batch_1',
              account: draft.account,
              contentProfileId: null,
              status: 'completed',
              fileName: draft.fileName,
              rowCount: 2,
              createdCount: 1,
              matchedCount: 0,
              skippedCount: 0,
              invalidCount: 1,
              importedAt: draft.importedAt,
              completedAt: '2026-05-21T12:00:00.000Z',
              discardedAt: null,
              createdAt: draft.createdAt,
              updatedAt: draft.updatedAt,
            });
        })
    );

    render(
      <HouseholdHookWrapper>
        <PendingFinalize draftId="draft_1" />
        <ImportDraftCard
          draft={draft}
          discardingDraftId={undefined}
          isDiscarding={false}
          onDiscard={vi.fn()}
        />
      </HouseholdHookWrapper>
    );

    await user.click(screen.getByRole('button', { name: 'Start finalize' }));

    await waitFor(() => {
      expect(screen.getByText('Finalizing…')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();

    act(() => {
      release();
    });
  });

  it('disables discard confirmation while finalize is pending', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    vi.mocked(fetchFinalizeImportDraft).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              id: 'batch_1',
              account: draft.account,
              contentProfileId: null,
              status: 'completed',
              fileName: draft.fileName,
              rowCount: 2,
              createdCount: 1,
              matchedCount: 0,
              skippedCount: 0,
              invalidCount: 1,
              importedAt: draft.importedAt,
              completedAt: '2026-05-21T12:00:00.000Z',
              discardedAt: null,
              createdAt: draft.createdAt,
              updatedAt: draft.updatedAt,
            });
        })
    );

    render(
      <HouseholdHookWrapper>
        <PendingFinalize draftId="draft_1" />
        <ImportDraftCard
          draft={draft}
          discardingDraftId={undefined}
          isDiscarding={false}
          onDiscard={vi.fn()}
        />
      </HouseholdHookWrapper>
    );

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await user.click(screen.getByRole('button', { name: 'Start finalize' }));

    await waitFor(() => {
      expect(screen.getByText('Finalizing…')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'Discard draft' })
    ).toBeDisabled();

    act(() => {
      release();
    });
  });

  it('keeps long account names and filenames readable by wrapping', () => {
    renderCard({
      draft: {
        ...draft,
        account: {
          ...draft.account,
          name: 'Joint Everyday Rewards Visa Infinite Privilege',
        },
        fileName:
          'td-visa-infinite-privilege-statement-january-through-march-2026.csv',
      },
    });

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
});
