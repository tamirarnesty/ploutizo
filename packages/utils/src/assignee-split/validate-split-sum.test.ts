import { describe, expect, it } from 'vitest';
import {
  SPLIT_SUM_MISMATCH_MESSAGE,
  validateSplitSum,
} from './validate-split-sum';

describe('validateSplitSum', () => {
  it('accepts matching assignee amounts', () => {
    expect(
      validateSplitSum(5000, [{ amountCents: 3000 }, { amountCents: 2000 }])
    ).toBeNull();
  });

  it('rejects when assignee amounts do not sum to the transaction amount', () => {
    expect(
      validateSplitSum(5000, [{ amountCents: 3000 }, { amountCents: 3000 }])
    ).toBe(SPLIT_SUM_MISMATCH_MESSAGE);
  });

  it('skips the check when assignees are omitted or empty', () => {
    expect(validateSplitSum(5000)).toBeNull();
    expect(validateSplitSum(5000, [])).toBeNull();
  });
});
