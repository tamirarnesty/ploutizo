import { describe, expect, it } from 'vitest';
import { computeImportRowStatus } from './import-row-status';

describe('computeImportRowStatus', () => {
  const readyRow = {
    status: 'ready' as const,
    reviewType: 'expense' as const,
    parsedType: 'expense' as const,
    reviewCategoryName: 'Dining',
    reviewAssigneeMemberIds: ['member_1'],
  };

  it('preserves invalid status', () => {
    expect(computeImportRowStatus({ ...readyRow, status: 'invalid' })).toBe(
      'invalid'
    );
  });

  it('preserves skipped status', () => {
    expect(computeImportRowStatus({ ...readyRow, status: 'skipped' })).toBe(
      'skipped'
    );
  });

  it('returns needs_review when type is missing', () => {
    expect(
      computeImportRowStatus({
        ...readyRow,
        reviewType: null,
        parsedType: null,
      })
    ).toBe('needs_review');
  });

  it('returns needs_review for settlement type', () => {
    expect(
      computeImportRowStatus({
        ...readyRow,
        reviewType: 'settlement',
      })
    ).toBe('needs_review');
  });

  it('returns needs_review when category is missing', () => {
    expect(
      computeImportRowStatus({
        ...readyRow,
        reviewCategoryName: null,
      })
    ).toBe('needs_review');
  });

  it('returns needs_review when assignees are missing', () => {
    expect(
      computeImportRowStatus({
        ...readyRow,
        reviewAssigneeMemberIds: [],
      })
    ).toBe('needs_review');
  });

  it('returns ready when expense has category and assignee', () => {
    expect(computeImportRowStatus(readyRow)).toBe('ready');
  });

  it('falls back to parsedType when reviewType is null', () => {
    expect(
      computeImportRowStatus({
        ...readyRow,
        reviewType: null,
        parsedType: 'expense',
      })
    ).toBe('ready');
  });
});
