import { describe, expect, it } from 'vitest';
import {
  canContinueImportReview,
  getImportReviewContinueBlocker,
  getImportReviewContinueBlockerReason,
  getLiveAssigneeMemberIds,
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
  it('treats invalid rows as not selectable', () => {
    expect(isImportRowSelectable({ status: 'ready' })).toBe(true);
    expect(isImportRowSelectable({ status: 'needs_review' })).toBe(true);
    expect(isImportRowSelectable({ status: 'invalid' })).toBe(false);
  });

  it('allows continue when selected rows still need review', () => {
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
    expect(canContinueImportReview(rows)).toBe(true);
    expect(isImportRowResolved(rows[1])).toBe(false);
    expect(getImportReviewContinueBlockerReason(rows)).toBeNull();
  });

  it('allows continue when every selected row is ready', () => {
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

  it('does not let unselected needs-review rows block Continue', () => {
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
        selectedForImport: false,
      },
    ];

    expect(canContinueImportReview(rows)).toBe(true);
    expect(getImportReviewContinueBlockerReason(rows)).toBeNull();
  });

  it('trusts derived ready status without a separate empty-assignee defense', () => {
    const rows = [
      {
        ...baseRow,
        status: 'ready' as const,
        reviewAssigneeMemberIds: [],
        selectedForImport: true,
      },
    ];

    expect(canContinueImportReview(rows)).toBe(true);
    expect(getImportReviewContinueBlockerReason(rows)).toBeNull();
  });

  it('does not client-gate continue when ready rows only reference departed members', () => {
    const rows = [
      {
        ...baseRow,
        status: 'ready' as const,
        reviewAssigneeMemberIds: ['departed_member'],
        selectedForImport: true,
      },
    ];
    const validAssigneeMemberIds = new Set(['member_1']);

    expect(canContinueImportReview(rows, { validAssigneeMemberIds })).toBe(
      true
    );
    expect(
      getImportReviewContinueBlockerReason(rows, { validAssigneeMemberIds })
    ).toBeNull();
  });

  it('explains when no rows are selected', () => {
    expect(getImportReviewContinueBlocker([baseRow])).toBe(
      'Select at least one row to continue.'
    );
  });

  it('filters assignee ids to live org members', () => {
    expect(
      getLiveAssigneeMemberIds(['member_1', 'gone'], new Set(['member_1']))
    ).toEqual(['member_1']);
    expect(getLiveAssigneeMemberIds([], new Set(['member_1']))).toEqual([]);
  });
});
