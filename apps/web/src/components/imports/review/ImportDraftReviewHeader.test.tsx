import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { toImportDraftMeta } from '@/lib/data-access/imports';
import { makeImportDraft } from '../test-fixtures/importDraft';
import { ImportDraftReviewHeader } from './ImportDraftReviewHeader';
import type { ComponentProps } from 'react';

vi.mock('@/lib/data-access/imports/useImportReviewAutosave', () => ({
  useImportReviewAutosaveStatus: () => 'idle',
}));

const renderHeader = (props: ComponentProps<typeof ImportDraftReviewHeader>) =>
  render(<ImportDraftReviewHeader {...props} />);

describe('ImportDraftReviewHeader', () => {
  it('keeps long account names and filenames readable by wrapping', () => {
    const meta = toImportDraftMeta(
      makeImportDraft({
        account: {
          id: 'acct_1',
          name: 'Joint Everyday Rewards Visa Infinite Privilege',
          institutionId: 'td',
          lastFour: '1234',
        },
        fileName:
          'td-visa-infinite-privilege-statement-january-through-march-2026.csv',
        rows: [],
      })
    );

    renderHeader({
      meta,
      rows: [],
      isContinuing: false,
      onContinue: vi.fn(),
    });

    const accountName = screen.getByRole('heading', {
      name: 'Joint Everyday Rewards Visa Infinite Privilege · TD · ••1234',
    });
    const subtitle = screen.getByText(
      'td-visa-infinite-privilege-statement-january-through-march-2026.csv · 0 transactions'
    );

    expect(accountName).toHaveClass('wrap-break-word');
    expect(accountName).not.toHaveClass('truncate');
    expect(subtitle).toHaveClass('wrap-break-word');
    expect(subtitle).not.toHaveClass('truncate');
  });

  it('offers discard with the same confirmation as the import hub', async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    const meta = toImportDraftMeta(makeImportDraft({ rows: [] }));

    renderHeader({
      meta,
      rows: [],
      isContinuing: false,
      onContinue: vi.fn(),
      discard: {
        onDiscard,
        discardingThisDraft: false,
        disabled: false,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onDiscard).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'Discard draft?' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
