import { describe, expect, it } from 'vitest';
import {
  evaluateImportRefundLinks,
  sumSelectedRefundsByTarget,
} from './import-refund-links';

const expenseRow = {
  id: 'expense-1',
  reviewType: 'expense' as const,
  parsedType: 'expense' as const,
  reviewAmount: 5000,
  parsedAmount: 5000,
  reviewCategoryId: 'cat-1',
  reviewAssigneeMemberIds: ['member-1'],
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  selectedForImport: true,
};

const refundRow = (
  overrides: Partial<{
    id: string;
    reviewAmount: number;
    reviewRefundOf: string | null;
    reviewRefundOfBatchRowId: string | null;
  }> = {}
) => ({
  id: 'refund-1',
  reviewType: 'refund' as const,
  parsedType: 'refund' as const,
  reviewAmount: 2000,
  parsedAmount: 2000,
  reviewCategoryId: null,
  reviewAssigneeMemberIds: [],
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: 'expense-1',
  selectedForImport: true,
  ...overrides,
});

describe('sumSelectedRefundsByTarget', () => {
  it('sums selected refunds toward same-import targets', () => {
    const totals = sumSelectedRefundsByTarget([
      expenseRow,
      refundRow({ reviewAmount: 1500 }),
      refundRow({
        id: 'refund-2',
        reviewAmount: 1000,
        reviewRefundOfBatchRowId: 'expense-1',
      }),
    ]);

    expect(totals.get('row:expense-1')).toBe(2500);
  });
});

describe('evaluateImportRefundLinks', () => {
  it('flags cumulative refunds exceeding the target amount', () => {
    const evaluations = evaluateImportRefundLinks(
      [
        expenseRow,
        refundRow({ reviewAmount: 3000 }),
        refundRow({
          id: 'refund-2',
          reviewAmount: 2500,
          reviewRefundOfBatchRowId: 'expense-1',
        }),
      ],
      { targetAccountId: 'account-1' }
    );

    expect(evaluations.get('refund-2')?.issues).toContain('cumulative_exceeds');
  });

  it('validates existing expense targets when facts are provided', () => {
    const evaluations = evaluateImportRefundLinks(
      [
        refundRow({
          reviewRefundOf: 'tx-missing',
          reviewRefundOfBatchRowId: null,
        }),
      ],
      {
        targetAccountId: 'account-1',
        existingExpenses: new Map(),
      }
    );

    expect(evaluations.get('refund-1')?.issues).toContain('missing_target');
  });

  it('includes prior refunds from other imports in cumulative cap', () => {
    const evaluations = evaluateImportRefundLinks(
      [expenseRow, refundRow({ reviewAmount: 2000 })],
      {
        targetAccountId: 'account-1',
        priorRefundsByTarget: new Map([['row:expense-1', 3500]]),
      }
    );

    expect(evaluations.get('refund-1')?.issues).toContain('cumulative_exceeds');
  });
});
