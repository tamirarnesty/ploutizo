import { describe, expect, it } from 'vitest';
import { assigneeRowsForPatchSplitSum } from '../services/transactions';

describe('assigneeRowsForPatchSplitSum', () => {
  const existing = [{ amountCents: 3000 }, { amountCents: 2000 }];

  it('returns null for types that do not use assignee-based card balances', () => {
    expect(
      assigneeRowsForPatchSplitSum('income', undefined, existing)
    ).toBeNull();
    expect(
      assigneeRowsForPatchSplitSum('transfer', [{ memberId: 'x', amountCents: 1 }], [])
    ).toBeNull();
  });

  it('uses payload assignees when provided (expense)', () => {
    const rows = assigneeRowsForPatchSplitSum(
      'expense',
      [
        { memberId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', amountCents: 5000 },
      ],
      existing
    );
    expect(rows).toEqual([{ amountCents: 5000 }]);
  });

  it('uses existing assignees when payload omits assignees (expense)', () => {
    const rows = assigneeRowsForPatchSplitSum('expense', undefined, existing);
    expect(rows).toEqual([{ amountCents: 3000 }, { amountCents: 2000 }]);
  });

  it('returns null when no assignee rows apply (e.g. empty expense with no splits)', () => {
    expect(assigneeRowsForPatchSplitSum('expense', undefined, [])).toBeNull();
    expect(assigneeRowsForPatchSplitSum('expense', [], [])).toBeNull();
  });

  it('covers refund and settlement types', () => {
    expect(
      assigneeRowsForPatchSplitSum('refund', undefined, [
        { amountCents: 100 },
      ])
    ).toEqual([{ amountCents: 100 }]);
    expect(
      assigneeRowsForPatchSplitSum('settlement', undefined, [
        { amountCents: 999 },
      ])
    ).toEqual([{ amountCents: 999 }]);
  });
});
