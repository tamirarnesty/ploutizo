import { describe, expect, it } from 'vitest';
import { computeImportDraftRowCounts } from './import-row-status';
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
    expect(result.invalidReason).toBeNull();
    expect(result.refundLink?.issues).toContain('wrong_account');
  });

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
    expect(computeImportDraftRowCounts([...evaluations.values()])).toEqual({
      rowCount: 4,
      validRowCount: 3,
      invalidRowCount: 1,
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
