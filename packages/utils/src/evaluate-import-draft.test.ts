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
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
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

describe('evaluateImportDraft — matching', () => {
  const matchRow = {
    ...baseRow,
    reviewType: 'expense' as const,
    parsedType: 'expense' as const,
    reviewRefundOf: null,
    selectedForImport: false,
    externalId: 'visa-1001',
    sourceDescription: 'Coffee',
    reviewMatchedTransactionId: null,
    reviewMatchDismissed: false,
  };

  const existing = {
    id: 'tx-1',
    accountId: 'account-1',
    type: 'expense',
    date: '2026-01-15',
    amount: 2500,
    description: 'Coffee',
    rawDescription: 'Coffee',
    externalId: 'visa-1001',
    deleted: false,
  };

  it('keeps an unselected exact match ready and exposes the accepted-match decision as null', () => {
    const result = evaluateImportDraftRow(
      matchRow,
      toImportDraftEvaluationContext([matchRow], {
        targetAccountId: 'account-1',
        existingTransactions: [existing],
      })
    );

    expect(result.status).toBe('ready');
    expect(result.blockers).not.toContain('match');
    expect(result.match?.exactCandidate?.kind).toBe('external_id');
    expect(result.match?.acceptedMatch).toBeNull();
  });

  it('marks an unselected advisory match as needs review without selecting it', () => {
    const advisoryRow = {
      ...matchRow,
      externalId: null,
      sourceDescription: 'STARBUCKS STORE 123',
      parsedDescription: 'STARBUCKS STORE 123',
      reviewDescription: 'STARBUCKS STORE 123',
    };
    const result = evaluateImportDraftRow(
      advisoryRow,
      toImportDraftEvaluationContext([advisoryRow], {
        targetAccountId: 'account-1',
        existingTransactions: [
          {
            ...existing,
            externalId: null,
            rawDescription: 'STARBUCKS STORE 99',
            description: 'STARBUCKS STORE 99',
          },
        ],
      })
    );

    expect(result.status).toBe('needs_review');
    expect(result.blockers).toContain('match');
    expect(result.match?.issues).toContain('advisory_unresolved');
    expect(result.match?.acceptedMatch).toBeNull();
    expect(result.match?.advisoryCandidates[0]?.kind).toBe('fuzzy_description');
  });

  it('blocks Continue on a selected advisory match until the user decides', () => {
    const advisoryRow = {
      ...matchRow,
      externalId: null,
      selectedForImport: true,
      sourceDescription: 'STARBUCKS STORE 123',
      parsedDescription: 'STARBUCKS STORE 123',
      reviewDescription: 'STARBUCKS STORE 123',
    };
    const result = evaluateImportDraftRow(
      advisoryRow,
      toImportDraftEvaluationContext([advisoryRow], {
        targetAccountId: 'account-1',
        existingTransactions: [
          {
            ...existing,
            externalId: null,
            rawDescription: 'STARBUCKS STORE 99',
            description: 'STARBUCKS STORE 99',
          },
        ],
      })
    );

    expect(result.status).toBe('needs_review');
    expect(result.blockers).toContain('match');
    expect(result.match?.issues).toContain('advisory_unresolved');
    expect(result.match?.acceptedMatch).toBeNull();
  });

  it('blocks Continue when a selected identity match is no longer valid', () => {
    const selected = {
      ...matchRow,
      externalId: null,
      selectedForImport: true,
      reviewMatchedTransactionId: 'tx-1',
      reviewAmount: 5000,
    };
    const result = evaluateImportDraftRow(
      selected,
      toImportDraftEvaluationContext([selected], {
        targetAccountId: 'account-1',
        existingTransactions: [{ ...existing, externalId: null }],
      })
    );

    expect(result.status).toBe('needs_review');
    expect(result.blockers).toContain('match');
    expect(result.match?.issues).toContain('invalidated_decision');
    expect(result.match?.acceptedMatch).toBeNull();
  });

  it('exposes an accepted match when the selected row still matches exactly', () => {
    const selected = {
      ...matchRow,
      selectedForImport: true,
      reviewMatchedTransactionId: 'tx-1',
    };
    const result = evaluateImportDraftRow(
      selected,
      toImportDraftEvaluationContext([selected], {
        targetAccountId: 'account-1',
        existingTransactions: [existing],
      })
    );

    expect(result.status).toBe('ready');
    expect(result.match?.acceptedMatch).toEqual({
      transactionId: 'tx-1',
      kind: 'external_id',
    });
  });
});
