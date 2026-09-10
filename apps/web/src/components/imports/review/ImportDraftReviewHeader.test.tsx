import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { toImportDraftMeta } from '@/lib/data-access/imports';
import { makeImportDraft } from '../test-fixtures/importDraft';
import { ImportDraftReviewHeader } from './ImportDraftReviewHeader';

vi.mock('@/lib/data-access/imports/useImportReviewAutosave', () => ({
  useImportReviewAutosaveStatus: () => 'idle',
}));

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

    render(
      <ImportDraftReviewHeader
        meta={meta}
        rows={[]}
        isContinuing={false}
        onRetryAutosave={vi.fn()}
        onContinue={vi.fn()}
      />
    );

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
});
