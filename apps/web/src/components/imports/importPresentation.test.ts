import { describe, expect, it } from 'vitest';
import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import {
  getImportRowReviewBlockers,
  getImportRowStatusTooltip,
  resolveImportRowAssigneeMemberIds,
  shouldDefaultExpandImportRow,
} from './importPresentation';

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
  reviewAssigneeHint: 'Tamir Arnesty',
  reviewAssigneeMemberIds: ['member_1'],
  reviewRefundLinkHint: null,
  reviewNotes: null,
  reviewTags: [],
  selectedForImport: false,
  status: 'ready' as const,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-20T12:00:00.000Z',
} satisfies ImportDraftRow;

const orgMembers = [
  {
    id: 'member_1',
    orgId: 'org_1',
    displayName: 'Tamir Arnesty',
    role: 'admin',
    joinedAt: '2026-01-01T00:00:00.000Z',
    externalId: 'user_1',
    firstName: 'Tamir',
    lastName: 'Arnesty',
    imageUrl: null,
  },
  {
    id: 'member_2',
    orgId: 'org_1',
    displayName: 'Alex Smith',
    role: 'admin',
    joinedAt: '2026-01-01T00:00:00.000Z',
    externalId: 'user_2',
    firstName: 'Alex',
    lastName: 'Smith',
    imageUrl: null,
  },
] satisfies OrgMember[];

describe('importPresentation review helpers', () => {
  it('describes ready rows in the status tooltip', () => {
    expect(getImportRowStatusTooltip(baseRow)).toBe('Ready to import');
  });

  it('lists missing review blockers in the status tooltip', () => {
    expect(
      getImportRowStatusTooltip({
        ...baseRow,
        status: 'needs_review',
        reviewCategoryName: null,
        reviewAssigneeMemberIds: [],
      })
    ).toBe('Needs review: missing category, assignee');
  });

  it('includes invalid reasons in the status tooltip', () => {
    expect(
      getImportRowStatusTooltip({
        ...baseRow,
        status: 'invalid',
        invalidReason: 'Amount must be a positive number.',
      })
    ).toBe('Amount must be a positive number.');
  });

  it('defaults detail rows open when there is review context', () => {
    expect(shouldDefaultExpandImportRow(baseRow)).toBe(false);
    expect(
      shouldDefaultExpandImportRow({
        ...baseRow,
        reviewNotes: 'Needs follow-up',
      })
    ).toBe(true);
    expect(
      shouldDefaultExpandImportRow({
        ...baseRow,
        status: 'needs_review',
      })
    ).toBe(true);
  });

  it('returns selected assignee member ids that still exist in the org', () => {
    expect(
      resolveImportRowAssigneeMemberIds(
        { ...baseRow, reviewAssigneeMemberIds: ['member_1', 'missing'] },
        orgMembers
      )
    ).toEqual(['member_1']);
    expect(
      resolveImportRowAssigneeMemberIds(
        { ...baseRow, reviewAssigneeMemberIds: [] },
        orgMembers
      )
    ).toEqual([]);
  });

  it('collects review blockers from row fields', () => {
    expect(
      getImportRowReviewBlockers({
        ...baseRow,
        reviewDate: null,
        parsedDate: null,
        reviewDescription: null,
        parsedDescription: null,
        reviewCategoryName: null,
        reviewAssigneeMemberIds: [],
      })
    ).toEqual(['date', 'description', 'category', 'assignee']);
  });
});
