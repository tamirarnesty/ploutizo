import { describe, expect, it } from 'vitest';
import type { ImportDraftRow } from '@ploutizo/types';
import {
  canContinueImportReview,
  getSelectableImportRows,
  getSelectedImportRows,
  isImportRowResolved,
  isImportRowSelectable,
} from './importRowSelection';

const baseRow = {
  id: 'row_1',
  batchId: 'draft_1',
  rowNumber: 2,
  invalidReason: null,
  rawData: {},
  externalId: null,
  sourceDate: '2026-05-02',
  sourceAmount: '42.18',
  sourceDescription: 'Coffee',
  sourceType: 'expense',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense' as const,
  parsedDescription: 'Coffee',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense' as const,
  reviewDescription: 'Coffee',
  reviewCategoryName: 'Dining',
  reviewAssigneeHint: null,
  reviewRefundLinkHint: null,
  reviewNotes: null,
  reviewTags: [],
  selectedForImport: false,
  status: 'ready' as const,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-20T12:00:00.000Z',
} satisfies ImportDraftRow;

describe('importRowSelection', () => {
  it('treats invalid and skipped rows as not selectable', () => {
    expect(isImportRowSelectable({ ...baseRow, status: 'ready' })).toBe(true);
    expect(isImportRowSelectable({ ...baseRow, status: 'needs_review' })).toBe(
      true
    );
    expect(isImportRowSelectable({ ...baseRow, status: 'invalid' })).toBe(
      false
    );
    expect(isImportRowSelectable({ ...baseRow, status: 'skipped' })).toBe(
      false
    );
  });

  it('requires selected rows to be ready before continue is allowed', () => {
    const rows = [
      {
        ...baseRow,
        id: 'row_1',
        status: 'ready' as const,
        selectedForImport: true,
      },
      {
        ...baseRow,
        id: 'row_2',
        status: 'needs_review' as const,
        selectedForImport: true,
      },
    ];

    expect(getSelectedImportRows(rows)).toHaveLength(2);
    expect(canContinueImportReview(rows)).toBe(false);
    expect(isImportRowResolved(rows[1])).toBe(false);
  });

  it('allows continue when every selected row is ready', () => {
    const rows = [
      {
        ...baseRow,
        id: 'row_1',
        status: 'ready' as const,
        selectedForImport: true,
      },
      {
        ...baseRow,
        id: 'row_2',
        status: 'ready' as const,
        selectedForImport: false,
      },
    ];

    expect(getSelectableImportRows(rows)).toHaveLength(2);
    expect(canContinueImportReview(rows)).toBe(true);
  });
});
