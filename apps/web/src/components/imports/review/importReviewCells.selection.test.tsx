import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { describe, expect, it, vi } from 'vitest';
import type { ImportReviewRow } from '@ploutizo/types';
import type { Category } from '@/lib/data-access/categories';
import { makeImportDraftRow } from '../test-fixtures/importDraft';
import { ImportDraftReviewProvider } from './ImportDraftReviewContext';
import { ImportReviewSelectionCell } from './importReviewCells';
import { ImportReviewRowScopeFixture } from './ImportReviewRowScope';

const mockCategory: Category = {
  id: 'cat_1',
  orgId: 'org_1',
  name: 'Dining',
  icon: null,
  colour: null,
  sortOrder: 0,
  archivedAt: null,
  createdAt: '2026-05-20T12:00:00Z',
};

const renderSelectionCell = (row: ImportReviewRow) => {
  const onSelectionChange = vi.fn();
  render(
    <TooltipProvider delay={0}>
      <ImportDraftReviewProvider
        draftId={row.batchId}
        cardAccountId="99999999-9999-4999-8999-999999999999"
        accounts={[]}
        categories={[mockCategory]}
        orgMembers={[]}
        updateRow={vi.fn()}
      >
        <ImportReviewRowScopeFixture row={row}>
          <ImportReviewSelectionCell
            expanded={false}
            onExpandedChange={() => undefined}
            onSelectionChange={onSelectionChange}
          />
        </ImportReviewRowScopeFixture>
      </ImportDraftReviewProvider>
    </TooltipProvider>
  );
  return { onSelectionChange };
};

describe('ImportReviewSelectionCell', () => {
  it('lets the user uncheck a checked row that is not selectable', async () => {
    const user = userEvent.setup();
    const row = makeImportDraftRow({
      id: 'row_needs_review',
      status: 'needs_review',
      reviewCategoryId: null,
      selectedForImport: true,
    });
    const { onSelectionChange } = renderSelectionCell(row);

    const checkbox = screen.getByRole('checkbox', {
      name: /Select/i,
    });
    expect(checkbox).toBeEnabled();

    await user.click(checkbox);
    expect(onSelectionChange).toHaveBeenCalledWith(false);
  });
});
