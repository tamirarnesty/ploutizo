import { describe, expect, it } from 'vitest';
import {
  evaluateImportRefundLink,
  evaluateImportRefundLinks,
  inheritRefundLinkFields,
  sumSelectedRefundsByTarget,
} from './import-refund-links';
import type { ImportRefundLinkDraftRow } from './import-refund-links';

const expenseRow = (
  overrides: Partial<ImportRefundLinkDraftRow> = {}
): ImportRefundLinkDraftRow => ({
  id: 'expense-1',
  reviewType: 'expense',
  parsedType: 'expense',
  reviewAmount: 5000,
  parsedAmount: 5000,
  reviewCategoryId: 'cat-1',
  reviewAssigneeMemberIds: ['m1'],
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  selectedForImport: true,
  ...overrides,
});

const refundRow = (
  overrides: Partial<ImportRefundLinkDraftRow> = {}
): ImportRefundLinkDraftRow => ({
  id: 'refund-1',
  reviewType: 'refund',
  parsedType: 'refund',
  reviewAmount: 2000,
  parsedAmount: 2000,
  reviewCategoryId: 'cat-1',
  reviewAssigneeMemberIds: ['m1'],
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: 'expense-1',
  selectedForImport: true,
  ...overrides,
});

describe('import refund links', () => {
  it('inherits category and assignees from a valid same-import expense', () => {
    const expense = expenseRow();
    const refund = refundRow();
    const evaluation = evaluateImportRefundLink(refund, [expense, refund], {
      targetAccountId: 'card-1',
    });

    expect(evaluation.valid).toBe(true);
    expect(inheritRefundLinkFields(evaluation)).toEqual({
      reviewCategoryId: 'cat-1',
      reviewAssigneeMemberIds: ['m1'],
    });
  });

  it('blocks unselected or unfinalizable same-import targets', () => {
    const expense = expenseRow({
      selectedForImport: false,
      reviewCategoryId: null,
    });
    const refund = refundRow();
    const evaluation = evaluateImportRefundLink(refund, [expense, refund], {
      targetAccountId: 'card-1',
    });

    expect(evaluation.valid).toBe(false);
    expect(evaluation.issues).toContain('target_not_selected');
    expect(evaluation.issues).toContain('target_unfinalizable');
  });

  it('blocks cumulative refunds that exceed the target expense', () => {
    const expense = expenseRow({ reviewAmount: 3000 });
    const refundA = refundRow({
      id: 'refund-a',
      reviewAmount: 2000,
      reviewRefundOfBatchRowId: 'expense-1',
    });
    const refundB = refundRow({
      id: 'refund-b',
      reviewAmount: 2000,
      reviewRefundOfBatchRowId: 'expense-1',
    });
    const rows = [expense, refundA, refundB];
    const totals = sumSelectedRefundsByTarget(rows);
    expect(totals.get('row:expense-1')).toBe(4000);

    const evaluations = evaluateImportRefundLinks(rows, {
      targetAccountId: 'card-1',
    });
    expect(evaluations.get('refund-a')?.issues).toContain('cumulative_exceeds');
    expect(evaluations.get('refund-b')?.issues).toContain('cumulative_exceeds');
  });

  it('validates existing same-card expenses and keeps wrong-account visible', () => {
    const refund = refundRow({
      reviewRefundOfBatchRowId: null,
      reviewRefundOf: 'tx-1',
    });
    const evaluation = evaluateImportRefundLink(refund, [refund], {
      targetAccountId: 'card-1',
      existingExpenses: new Map([
        [
          'tx-1',
          {
            id: 'tx-1',
            accountId: 'card-2',
            amount: 9000,
            categoryId: 'cat-9',
            assigneeMemberIds: ['m9'],
            type: 'expense',
            deleted: false,
          },
        ],
      ]),
    });

    expect(evaluation.linked).toBe(true);
    expect(evaluation.valid).toBe(false);
    expect(evaluation.issues).toContain('wrong_account');
    expect(evaluation.inheritedCategoryId).toBe('cat-9');
  });
});
