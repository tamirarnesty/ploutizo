import '@/test/mockTanstackRouter';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportDraftSummary } from '@ploutizo/types';
import { expectOverlayMounted } from '@/test/overlayCloseContract';
import { ImportDraftCard } from './ImportDraftCard';
import type { ComponentProps } from 'react';

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
    <ImportDraftCard
      draft={draft}
      discardingDraftId={undefined}
      isDiscarding={false}
      onDiscard={vi.fn()}
      {...overrides}
    />
  );

describe('ImportDraftCard', () => {
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
