import { describe, expect, it } from 'vitest';
import { assigneeRowsForPatchSplitSum } from '../services/transactions';

describe('assigneeRowsForPatchSplitSum', () => {
  const existing = [{ amountCents: 3000 }, { amountCents: 2000 }];

  it('uses payload assignees when provided', () => {
    const rows = assigneeRowsForPatchSplitSum(
      [
        {
          memberId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
          amountCents: 5000,
          percentage: 100,
        },
      ],
      existing
    );
    expect(rows).toEqual([{ amountCents: 5000 }]);
  });

  it('uses existing assignees when payload omits assignees', () => {
    const rows = assigneeRowsForPatchSplitSum(undefined, existing);
    expect(rows).toEqual([{ amountCents: 3000 }, { amountCents: 2000 }]);
  });

  it('returns null when no assignee rows apply', () => {
    expect(assigneeRowsForPatchSplitSum(undefined, [])).toBeNull();
    expect(assigneeRowsForPatchSplitSum([], [])).toBeNull();
  });
});
