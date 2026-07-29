import { describe, expect, it } from 'vitest';
import {
  buildImportDraftRowViews,
  evaluateImportDraftRow,
  toImportDraftEvaluationContext,
} from './evaluate-import-draft';

const baseRow = {
  id: 'row-1',
  status: 'needs_review' as const,
  reviewDate: '2026-01-15',
  reviewAmount: 2500,
  reviewType: 'refund' as const,
  reviewDescription: 'Refund',
  parsedDate: '2026-01-15',
  parsedAmount: 2500,
  parsedType: 'refund' as const,
  parsedDescription: 'Refund',
  reviewCategoryId: null,
  reviewAssigneeMemberIds: ['member-1'],
  reviewCounterpartAccountId: null,
  reviewRefundOf: 'tx-1',
  selectedForImport: true,
};

describe('evaluateImportDraftRow', () => {
  it('derives needs_review when a linked refund target is invalid', () => {
    const rows = [baseRow];
    const ctx = toImportDraftEvaluationContext(rows, {
      targetAccountId: 'account-1',
      existingExpenses: new Map([
        [
          'tx-1',
          {
            id: 'tx-1',
            accountId: 'other-account',
            amount: 5000,
            categoryId: 'cat-1',
            assigneeMemberIds: ['member-1'],
            type: 'expense',
            deleted: false,
          },
        ],
      ]),
    });

    const result = evaluateImportDraftRow(baseRow, ctx);

    expect(result.status).toBe('needs_review');
    expect(result.blockers).toContain('refund_link');
    expect(result.refundLink?.issues).toContain('wrong_account');
  });

  it('preserves skipped sticky status', () => {
    const skipped = { ...baseRow, status: 'skipped' as const, reviewRefundOf: null };
    const ctx = toImportDraftEvaluationContext([skipped], {
      targetAccountId: 'account-1',
      existingExpenses: new Map(),
    });

    expect(evaluateImportDraftRow(skipped, ctx).status).toBe('skipped');
  });
});

describe('buildImportDraftRowViews', () => {
  it('overlays derived status and invalidReason onto durable rows', () => {
    const invalidRow = {
      ...baseRow,
      id: 'row-2',
      reviewType: 'expense' as const,
      parsedType: 'expense' as const,
      reviewDate: null,
      parsedDate: null,
      reviewRefundOf: null,
    };

    const views = buildImportDraftRowViews([invalidRow], {
      targetAccountId: 'account-1',
      existingExpenses: new Map(),
    });

    expect(views[0]?.status).toBe('invalid');
    expect(views[0]?.invalidReason).toContain('Date');
  });
});
