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
  it('adds a links-table filter when importLink is present', () => {
    const unfiltered = buildConditions(BASE);
    const matched = buildConditions({
      ...BASE,
      importLink: { batchId: BATCH, outcome: 'matched' },
    });
    const created = buildConditions({
      ...BASE,
      importLink: { batchId: BATCH, outcome: 'created' },
    });

    expect(matched.length).toBe(unfiltered.length + 1);
    expect(created.length).toBe(unfiltered.length + 1);
  });
});
