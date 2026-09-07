import { describe, expect, it, vi } from 'vitest';
import { buildConditions } from '@/lib/queries/transactions';

vi.mock('@ploutizo/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

const BASE = {
  orgId: 'org_1',
  page: 1,
  limit: 20,
  sort: 'date' as const,
  order: 'desc' as const,
};

const BATCH = '550e8400-e29b-41d4-a716-446655440040';

describe('transaction list import provenance filter', () => {
  it('adds a links-table filter only when batch and outcome are both present', () => {
    const unfiltered = buildConditions(BASE);
    const matched = buildConditions({
      ...BASE,
      importBatchId: BATCH,
      importOutcome: 'matched',
    });
    const created = buildConditions({
      ...BASE,
      importBatchId: BATCH,
      importOutcome: 'created',
    });
    const batchOnly = buildConditions({
      ...BASE,
      importBatchId: BATCH,
    });
    const outcomeOnly = buildConditions({
      ...BASE,
      importOutcome: 'matched',
    });

    expect(matched.length).toBe(unfiltered.length + 1);
    expect(created.length).toBe(unfiltered.length + 1);
    expect(batchOnly.length).toBe(unfiltered.length);
    expect(outcomeOnly.length).toBe(unfiltered.length);
  });
});
