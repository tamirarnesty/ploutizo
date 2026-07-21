import { describe, expect, it } from 'vitest';
import {
  canContinueImportReview,
  getImportReviewContinueBlocker,
  getImportReviewContinueBlockerReason,
  getSelectableImportRows,
  getSelectedImportRows,
  isImportRowReadyForImport,
  isImportRowResolved,
  isImportRowSelectable,
} from './import-row-readiness';

const baseRow = {
  status: 'ready' as const,
  selectedForImport: false,
  reviewAssigneeMemberIds: [] as string[],
};

describe('import-row-readiness', () => {
  it('treats invalid and skipped rows as not selectable', () => {
    expect(isImportRowSelectable({ status: 'ready' })).toBe(true);
    expect(isImportRowSelectable({ status: 'needs_review' })).toBe(true);
    expect(isImportRowSelectable({ status: 'invalid' })).toBe(false);
    expect(isImportRowSelectable({ status: 'skipped' })).toBe(false);
  });

  it('requires selected rows to be ready before continue is allowed', () => {
    const rows = [
      {
        ...baseRow,
        status: 'ready' as const,
        reviewAssigneeMemberIds: ['member_1'],
        selectedForImport: true,
      },
      {
        ...baseRow,
        status: 'needs_review' as const,
        selectedForImport: true,
      },
    ];

    expect(getSelectedImportRows(rows)).toHaveLength(2);
    expect(canContinueImportReview(rows)).toBe(false);
    expect(isImportRowResolved(rows[1])).toBe(false);
  });

  it('allows continue when every selected row is ready and has an assignee', () => {
    const rows = [
      {
        ...baseRow,
        status: 'ready' as const,
        reviewAssigneeMemberIds: ['member_1'],
        selectedForImport: true,
      },
      {
        ...baseRow,
        status: 'ready' as const,
        reviewAssigneeMemberIds: ['member_1'],
        selectedForImport: false,
      },
    ];

    expect(getSelectableImportRows(rows)).toHaveLength(2);
    expect(canContinueImportReview(rows)).toBe(true);
    expect(isImportRowReadyForImport(rows[0])).toBe(true);
  });

  it('blocks continue when selected rows are missing assignees', () => {
    const rows = [
      {
        ...baseRow,
        status: 'ready' as const,
        reviewAssigneeMemberIds: [],
        selectedForImport: true,
      },
    ];

    expect(canContinueImportReview(rows)).toBe(false);
    expect(getImportReviewContinueBlockerReason(rows)).toEqual({
      kind: 'missing_assignee',
      count: 1,
    });
    expect(getImportReviewContinueBlocker(rows)).toBe(
      '1 selected row needs an assignee.'
    );
  });

  it('explains when no rows are selected', () => {
    expect(getImportReviewContinueBlocker([baseRow])).toBe(
      'Select at least one row to continue.'
    );
  });
});
