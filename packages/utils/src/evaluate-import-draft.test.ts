import { describe, expect, it } from 'vitest';
import {
  buildImportDraftRowViews,
  evaluateImportDraft,
  evaluateImportDraftRow,
  toImportDraftEvaluationContext,
} from './evaluate-import-draft';
import type { ImportDraftDurableRow } from './evaluate-import-draft';

const baseRow: ImportDraftDurableRow = {
  id: 'row-1',
  reviewDate: '2026-01-15',
  reviewAmount: 2500,
  reviewType: 'refund',
  reviewDescription: 'Refund',
  parsedDate: '2026-01-15',
  parsedAmount: 2500,
  parsedType: 'refund',
  parsedDescription: 'Refund',
  reviewCategoryId: 'cat-1',
  reviewAssigneeMemberIds: ['member-1'],
  reviewCounterpartAccountId: null,
  reviewRefundOf: 'tx-1',
  reviewRefundOfBatchRowId: null,
  selectedForImport: true,
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
};

describe('evaluateImportDraftRow', () => {
  it('derives ready for an unselected complete row', () => {
    const unselected = {
      ...baseRow,
      reviewRefundOf: null,
      selectedForImport: false,
    };
    const ctx = toImportDraftEvaluationContext([unselected], {
      targetAccountId: 'account-1',
      existingExpenses: new Map(),
    });

    expect(evaluateImportDraftRow(unselected, ctx).status).toBe('ready');
  });
});

describe('evaluateImportDraft', () => {
  it('derives mixed-row review state and live counts from durable facts', () => {
    const ready = {
      ...baseRow,
      id: 'row-ready',
      reviewRefundOf: null,
      selectedForImport: true,
    };
    const needsReview = {
      ...baseRow,
      id: 'row-needs-review',
      reviewType: 'expense' as const,
      parsedType: 'expense' as const,
      reviewCategoryId: null,
      reviewRefundOf: null,
      selectedForImport: true,
    };
    const invalid = {
      ...baseRow,
      id: 'row-invalid',
      reviewType: 'expense' as const,
      parsedType: 'expense' as const,
      reviewDate: null,
      parsedDate: null,
      reviewRefundOf: null,
      selectedForImport: false,
    };
    const refundBlocked = {
      ...baseRow,
      id: 'row-refund-blocked',
      selectedForImport: true,
    };

    const rows = [ready, needsReview, invalid, refundBlocked];
    const evaluations = evaluateImportDraft(rows, {
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

    expect(evaluations.get('row-ready')).toMatchObject({
      status: 'ready',
      blockers: [],
      invalidReason: null,
    });
    expect(evaluations.get('row-needs-review')).toMatchObject({
      status: 'needs_review',
      blockers: ['category'],
      invalidReason: null,
    });
    expect(evaluations.get('row-invalid')?.status).toBe('invalid');
    expect(evaluations.get('row-invalid')?.invalidReason).toContain('Date');
    expect(evaluations.get('row-refund-blocked')).toMatchObject({
      status: 'needs_review',
      blockers: ['refund_link'],
    });
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
    expect(views[0]?.selectedForImport).toBe(true);
  });
});

describe('evaluateImportDraft — matching', () => {
  const matchRow = {
    ...baseRow,
    reviewType: 'expense' as const,
    parsedType: 'expense' as const,
    reviewRefundOf: null,
    selectedForImport: true,
    externalId: null,
    sourceDescription: 'STARBUCKS STORE 123',
    parsedDescription: 'STARBUCKS STORE 123',
    reviewDescription: 'STARBUCKS STORE 123',
    reviewMatchedTransactionId: null,
    reviewMatchDismissed: false,
  };

  it('maps unresolved match issues to needs_review and a match blocker', () => {
    const result = evaluateImportDraftRow(
      matchRow,
      toImportDraftEvaluationContext([matchRow], {
        targetAccountId: 'account-1',
        existingTransactions: [
          {
            id: 'tx-1',
            accountId: 'account-1',
            type: 'expense',
            date: '2026-01-15',
            amount: 2500,
            description: 'STARBUCKS STORE 99',
            rawDescription: 'STARBUCKS STORE 99',
            externalId: null,
            deleted: false,
          },
        ],
      })
    );

    expect(result.status).toBe('needs_review');
    expect(result.blockers).toContain('match');
    expect(result.match?.issues).toContain('advisory_unresolved');
  });
});
