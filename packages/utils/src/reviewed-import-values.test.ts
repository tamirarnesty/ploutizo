import { describe, expect, it } from 'vitest';
import { resolveReviewedImportValues } from './reviewed-import-values';

const parsedRow = {
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense',
  parsedDescription: 'COFFEE SHOP #42',
  reviewDate: null,
  reviewAmount: null,
  reviewType: null,
  reviewDescription: null,
  reviewCategoryId: 'cat-1',
  reviewAssigneeMemberIds: ['member-1'],
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  reviewNotes: 'weekly',
  reviewTagIds: ['tag-1'],
};

describe('resolveReviewedImportValues', () => {
  it('accepts parsed values when the row has no reviewed edits', () => {
    expect(resolveReviewedImportValues(parsedRow)).toEqual({
      date: '2026-05-02',
      amount: 4218,
      type: 'expense',
      description: 'COFFEE SHOP #42',
      categoryId: 'cat-1',
      assigneeMemberIds: ['member-1'],
      counterpartAccountId: null,
      refundOf: null,
      refundOfBatchRowId: null,
      notes: 'weekly',
      tagIds: ['tag-1'],
    });
  });

  it('lets reviewed edits override parsed values', () => {
    expect(
      resolveReviewedImportValues({
        ...parsedRow,
        reviewDate: '2026-05-03',
        reviewAmount: 5000,
        reviewType: 'refund',
        reviewDescription: 'Neighborhood Coffee',
        reviewRefundOf: 'txn-1',
      })
    ).toEqual({
      date: '2026-05-03',
      amount: 5000,
      type: 'refund',
      description: 'Neighborhood Coffee',
      categoryId: 'cat-1',
      assigneeMemberIds: ['member-1'],
      counterpartAccountId: null,
      refundOf: 'txn-1',
      refundOfBatchRowId: null,
      notes: 'weekly',
      tagIds: ['tag-1'],
    });
  });

  it('does not fall back to parsed type when a reviewed type is present but unresolved', () => {
    expect(
      resolveReviewedImportValues({
        ...parsedRow,
        reviewType: 'nope',
      }).type
    ).toBeNull();
  });

  it('keeps unresolved values nullable without throwing', () => {
    expect(
      resolveReviewedImportValues({
        reviewDate: null,
        parsedDate: null,
        reviewAmount: null,
        parsedAmount: null,
        reviewType: 'nope',
        parsedType: null,
        reviewDescription: '   ',
        parsedDescription: null,
      })
    ).toEqual({
      date: null,
      amount: null,
      type: null,
      description: null,
      categoryId: null,
      assigneeMemberIds: [],
      counterpartAccountId: null,
      refundOf: null,
      refundOfBatchRowId: null,
      notes: null,
      tagIds: [],
    });
  });

  it('copies assignee and tag arrays so callers cannot mutate the source row', () => {
    const assignees = ['member-1'];
    const tags = ['tag-1'];
    const resolved = resolveReviewedImportValues({
      ...parsedRow,
      reviewAssigneeMemberIds: assignees,
      reviewTagIds: tags,
    });

    resolved.assigneeMemberIds.push('member-2');
    resolved.tagIds.push('tag-2');

    expect(assignees).toEqual(['member-1']);
    expect(tags).toEqual(['tag-1']);
  });
});
