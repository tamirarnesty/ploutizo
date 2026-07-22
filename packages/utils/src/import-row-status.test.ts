import { describe, expect, it } from 'vitest';
import {
  computeImportDraftRowCounts,
  deriveImportRowStatus,
  evaluateImportRow,
  getImportRowReviewBlockers,
  isImportRowStructurallyInvalid,
  isImportTransactionType,
  resolveImportRowReviewAmount,
  resolveImportRowReviewDate,
  resolveImportRowReviewDescription,
  resolveImportRowReviewType,
  toImportTransactionType,
  withDerivedImportRowStatus,
} from './import-row-status';

describe('import transaction type coercion', () => {
  it('accepts known import transaction types', () => {
    expect(isImportTransactionType('expense')).toBe(true);
    expect(toImportTransactionType('refund')).toBe('refund');
  });

  it('rejects unknown or empty values', () => {
    expect(isImportTransactionType('transfer')).toBe(false);
    expect(toImportTransactionType(null)).toBeNull();
    expect(toImportTransactionType('nope')).toBeNull();
  });
});

describe('effective review field resolvers', () => {
  it('falls back from review to parsed fields', () => {
    expect(
      resolveImportRowReviewDate({
        reviewDate: null,
        parsedDate: '2026-05-02',
      })
    ).toBe('2026-05-02');
    expect(
      resolveImportRowReviewAmount({
        reviewAmount: null,
        parsedAmount: 4218,
      })
    ).toBe(4218);
    expect(
      resolveImportRowReviewType({
        reviewType: null,
        parsedType: 'expense',
      })
    ).toBe('expense');
    expect(
      resolveImportRowReviewDescription({
        reviewDescription: null,
        parsedDescription: 'Coffee',
      })
    ).toBe('Coffee');
  });
});

describe('isImportRowStructurallyInvalid', () => {
  const validFields = {
    reviewDate: '2026-05-02',
    reviewAmount: 4218,
    reviewType: 'expense' as const,
    reviewDescription: 'Coffee',
    parsedDate: null,
    parsedAmount: null,
    parsedType: null,
    parsedDescription: null,
  };

  it('returns false when review fields are complete', () => {
    expect(isImportRowStructurallyInvalid(validFields)).toBe(false);
  });

  it('returns true when date is missing', () => {
    expect(
      isImportRowStructurallyInvalid({ ...validFields, reviewDate: null })
    ).toBe(true);
  });

  it('returns true when amount is non-positive', () => {
    expect(
      isImportRowStructurallyInvalid({ ...validFields, reviewAmount: 0 })
    ).toBe(true);
  });

  it('falls back to parsed fields when review fields are null', () => {
    expect(
      isImportRowStructurallyInvalid({
        reviewDate: null,
        reviewAmount: null,
        reviewType: null,
        reviewDescription: null,
        parsedDate: '2026-05-02',
        parsedAmount: 4218,
        parsedType: 'expense',
        parsedDescription: 'Coffee',
      })
    ).toBe(false);
  });
});

describe('deriveImportRowStatus', () => {
  const readyFields = {
    status: 'ready' as const,
    reviewDate: '2026-05-02',
    reviewAmount: 4218,
    reviewType: 'expense' as const,
    reviewDescription: 'Coffee',
    parsedDate: null as string | null,
    parsedAmount: null as number | null,
    parsedType: null as 'expense' | null,
    parsedDescription: null as string | null,
    reviewCategoryId: 'cat-1',
    reviewAssigneeMemberIds: ['member_1'],
  };

  it('marks structurally invalid rows as invalid even when previously ready', () => {
    expect(
      deriveImportRowStatus({
        ...readyFields,
        reviewAmount: null,
        parsedAmount: null,
      })
    ).toBe('invalid');
  });

  it('recovers from invalid to ready when structural fields and review fields are complete', () => {
    expect(
      deriveImportRowStatus({
        ...readyFields,
        status: 'invalid',
      })
    ).toBe('ready');
  });

  it('preserves skipped', () => {
    expect(
      deriveImportRowStatus({
        ...readyFields,
        status: 'skipped',
        reviewCategoryId: null,
      })
    ).toBe('skipped');
  });

  it('returns needs_review when category is cleared', () => {
    expect(
      deriveImportRowStatus({
        ...readyFields,
        reviewCategoryId: null,
      })
    ).toBe('needs_review');
  });

  it('marks rows without an effective type as structurally invalid', () => {
    expect(
      deriveImportRowStatus({
        ...readyFields,
        reviewType: null,
        parsedType: null,
      })
    ).toBe('invalid');
  });

  it('returns needs_review for settlement type', () => {
    expect(
      deriveImportRowStatus({
        ...readyFields,
        reviewType: 'settlement',
      })
    ).toBe('needs_review');
  });

  it('returns needs_review when assignees are missing', () => {
    expect(
      deriveImportRowStatus({
        ...readyFields,
        reviewAssigneeMemberIds: [],
      })
    ).toBe('needs_review');
  });

  it('falls back to parsedType when reviewType is null', () => {
    expect(
      deriveImportRowStatus({
        ...readyFields,
        reviewType: null,
        parsedType: 'expense',
      })
    ).toBe('ready');
  });

  it('withDerivedImportRowStatus writes derived status onto the row', () => {
    const row = withDerivedImportRowStatus({
      ...readyFields,
      reviewAmount: null,
      parsedAmount: null,
    });
    expect(row.status).toBe('invalid');
  });
});

describe('computeImportDraftRowCounts', () => {
  it('counts invalid rows and derives valid count', () => {
    expect(
      computeImportDraftRowCounts([
        { status: 'ready' },
        { status: 'needs_review' },
        { status: 'invalid' },
        { status: 'skipped' },
      ])
    ).toEqual({
      rowCount: 4,
      validRowCount: 3,
      invalidRowCount: 1,
    });
  });
});

describe('evaluateImportRow', () => {
  const readyFields = {
    status: 'ready' as const,
    reviewDate: '2026-05-02',
    reviewAmount: 4218,
    reviewType: 'expense' as const,
    reviewDescription: 'Coffee',
    parsedDate: null as string | null,
    parsedAmount: null as number | null,
    parsedType: null as 'expense' | null,
    parsedDescription: null as string | null,
    reviewCategoryId: 'cat-1',
    reviewAssigneeMemberIds: ['member_1'],
  };

  it('returns ready with no blockers for a complete expense row', () => {
    expect(evaluateImportRow(readyFields)).toEqual({
      status: 'ready',
      blockers: [],
    });
  });

  it('keeps status and blockers on one evaluation path', () => {
    const incomplete = {
      ...readyFields,
      reviewDate: null,
      reviewAmount: 0,
      reviewDescription: null,
      reviewType: null,
      parsedType: null,
      reviewCategoryId: null,
      reviewAssigneeMemberIds: [],
    };
    const evaluation = evaluateImportRow(incomplete);

    expect(evaluation).toEqual({
      status: 'invalid',
      blockers: [
        'date',
        'amount',
        'description',
        'type',
        'category',
        'assignee',
      ],
    });
    expect(deriveImportRowStatus(incomplete)).toBe(evaluation.status);
    expect(getImportRowReviewBlockers(incomplete)).toEqual(evaluation.blockers);
  });

  it('flags settlement as needs_review with a settlement blocker', () => {
    const settlement = {
      ...readyFields,
      reviewType: 'settlement' as const,
    };
    const evaluation = evaluateImportRow(settlement);

    expect(evaluation).toEqual({
      status: 'needs_review',
      blockers: ['settlement'],
    });
    expect(deriveImportRowStatus(settlement)).toBe(evaluation.status);
    expect(getImportRowReviewBlockers(settlement)).toEqual(evaluation.blockers);
  });

  it('preserves skipped while still reporting blockers', () => {
    expect(
      evaluateImportRow({
        ...readyFields,
        status: 'skipped',
        reviewCategoryId: null,
      })
    ).toEqual({
      status: 'skipped',
      blockers: ['category'],
    });
  });
});
