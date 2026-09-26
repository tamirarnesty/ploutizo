import { describe, expect, it } from 'vitest';
import type { ImportReviewRow } from '@ploutizo/types';
import { makeImportDraftRow } from '../test-fixtures/importDraft';
import { sortImportReviewRows } from './sortImportReviewRows';

const sources = {
  categories: [{ id: 'cat_dining', name: 'Dining' }],
  accounts: [{ id: 'acct_chequing', name: 'Chequing' }],
  orgMembers: [
    {
      id: 'member_ada',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    },
    {
      id: 'member_alan',
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan@example.com',
    },
  ],
};

const ids = (rows: readonly ImportReviewRow[]) => rows.map((row) => row.id);

describe('sortImportReviewRows', () => {
  it('keeps the incoming order when nothing is sorted', () => {
    const rows = [
      makeImportDraftRow({ id: 'row_b', rowNumber: 2 }),
      makeImportDraftRow({ id: 'row_a', rowNumber: 1 }),
    ];

    expect(sortImportReviewRows(rows, [], sources)).toBe(rows);
  });

  it('sorts invalid rows ahead of needs-review and ready', () => {
    const rows = [
      makeImportDraftRow({ id: 'ready', rowNumber: 1, status: 'ready' }),
      makeImportDraftRow({
        id: 'review',
        rowNumber: 2,
        status: 'needs_review',
      }),
      makeImportDraftRow({ id: 'invalid', rowNumber: 3, status: 'invalid' }),
    ];

    expect(
      ids(
        sortImportReviewRows(rows, [{ id: 'selection', desc: false }], sources)
      )
    ).toEqual(['invalid', 'review', 'ready']);
    expect(
      ids(
        sortImportReviewRows(rows, [{ id: 'selection', desc: true }], sources)
      )
    ).toEqual(['ready', 'review', 'invalid']);
  });

  it('sorts empty categories and paid-from accounts ahead of named ones', () => {
    const rows = [
      makeImportDraftRow({
        id: 'dining',
        rowNumber: 1,
        reviewCategoryId: 'cat_dining',
      }),
      makeImportDraftRow({
        id: 'empty',
        rowNumber: 2,
        reviewCategoryId: null,
      }),
      makeImportDraftRow({
        id: 'paid',
        rowNumber: 3,
        reviewType: 'settlement',
        reviewCategoryId: null,
        reviewCounterpartAccountId: 'acct_chequing',
      }),
      makeImportDraftRow({
        id: 'unpaid',
        rowNumber: 4,
        reviewType: 'settlement',
        reviewCategoryId: null,
        reviewCounterpartAccountId: null,
      }),
    ];

    expect(
      ids(
        sortImportReviewRows(rows, [{ id: 'category', desc: false }], sources)
      )
    ).toEqual(['empty', 'unpaid', 'paid', 'dining']);
  });

  it('sorts missing assignees ahead of named members', () => {
    const rows = [
      makeImportDraftRow({
        id: 'ada',
        rowNumber: 1,
        reviewAssigneeMemberIds: ['member_ada'],
      }),
      makeImportDraftRow({
        id: 'none',
        rowNumber: 2,
        reviewAssigneeMemberIds: [],
      }),
      makeImportDraftRow({
        id: 'alan',
        rowNumber: 3,
        reviewAssigneeMemberIds: ['member_alan'],
      }),
    ];

    expect(
      ids(
        sortImportReviewRows(rows, [{ id: 'assignee', desc: false }], sources)
      )
    ).toEqual(['none', 'ada', 'alan']);
  });

  it('sorts missing dates first, then chronologically', () => {
    const rows = [
      makeImportDraftRow({
        id: 'later',
        rowNumber: 1,
        reviewDate: '2026-06-01',
        parsedDate: '2026-06-01',
      }),
      makeImportDraftRow({
        id: 'missing',
        rowNumber: 2,
        reviewDate: null,
        parsedDate: null,
      }),
      makeImportDraftRow({
        id: 'earlier',
        rowNumber: 3,
        reviewDate: '2026-01-01',
        parsedDate: '2026-01-01',
      }),
    ];

    expect(
      ids(sortImportReviewRows(rows, [{ id: 'date', desc: false }], sources))
    ).toEqual(['missing', 'earlier', 'later']);
  });

  it('breaks ties by row number', () => {
    const rows = [
      makeImportDraftRow({
        id: 'second',
        rowNumber: 4,
        reviewDescription: 'Coffee',
      }),
      makeImportDraftRow({
        id: 'first',
        rowNumber: 2,
        reviewDescription: 'Coffee',
      }),
    ];

    expect(
      ids(
        sortImportReviewRows(
          rows,
          [{ id: 'description', desc: false }],
          sources
        )
      )
    ).toEqual(['first', 'second']);
  });
});
