import { describe, expect, it } from 'vitest';
import { resolveRefundTargetFactRemovals } from './mergeImportDraftRefundTargetFacts';

describe('resolveRefundTargetFactRemovals', () => {
  it('does nothing when the patch did not touch reviewRefundOf', () => {
    expect(
      resolveRefundTargetFactRemovals(undefined, undefined, [
        { reviewRefundOf: 'expense_1' },
      ])
    ).toEqual([]);
  });

  it('removes a cleared link when no sibling still references it', () => {
    expect(
      resolveRefundTargetFactRemovals('expense_1', null, [
        { reviewRefundOf: null },
        { reviewRefundOf: 'expense_2' },
      ])
    ).toEqual(['expense_1']);
  });

  it('keeps a cleared link when a sibling still references it', () => {
    expect(
      resolveRefundTargetFactRemovals('expense_1', null, [
        { reviewRefundOf: null },
        { reviewRefundOf: 'expense_1' },
      ])
    ).toEqual([]);
  });

  it('removes the previous id on retarget when unused', () => {
    expect(
      resolveRefundTargetFactRemovals('expense_a', 'expense_b', [
        { reviewRefundOf: 'expense_b' },
      ])
    ).toEqual(['expense_a']);
  });

  it('keeps the previous id on retarget when a sibling still references it', () => {
    expect(
      resolveRefundTargetFactRemovals('expense_a', 'expense_b', [
        { reviewRefundOf: 'expense_b' },
        { reviewRefundOf: 'expense_a' },
      ])
    ).toEqual([]);
  });
});
