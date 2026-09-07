import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@/lib/errors';
import { listImportHistory } from '@/services/imports';
import { listImportHistoryPage } from '@/lib/queries/imports';
import { encodeImportHistoryCursor } from '@/lib/import-history-cursor';

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock('@/lib/queries/imports', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected @/lib/queries/imports module shape.');
  }
  return {
    ...actual,
    listImportHistoryPage: vi.fn(),
  };
});

const ACCOUNT = '550e8400-e29b-41d4-a716-446655440010';
const COMPLETED = '550e8400-e29b-41d4-a716-446655440040';
const DISCARDED = '550e8400-e29b-41d4-a716-446655440041';
const PREP = '550e8400-e29b-41d4-a716-446655440060';

const identity = {
  accountId: ACCOUNT,
  accountName: 'Visa',
  accountInstitutionId: 'td',
  accountLastFour: '1234',
  contentProfileId: 'internal',
  fileName: 'statement.csv',
  rowCount: 4,
  importedAt: new Date('2026-05-20T12:00:00.000Z'),
  createdAt: new Date('2026-05-20T12:00:00.000Z'),
  updatedAt: new Date('2026-05-21T12:00:00.000Z'),
  revision: 1,
};

const completedRow = {
  ...identity,
  id: COMPLETED,
  status: 'completed' as const,
  completedAt: new Date('2026-05-21T12:00:00.000Z'),
  discardedAt: null,
  finalizedPreparedSetId: PREP,
  createdCount: 1,
  matchedCount: 1,
  skippedCount: 1,
  invalidCount: 1,
};

const discardedRow = {
  ...identity,
  id: DISCARDED,
  status: 'discarded' as const,
  fileName: 'old.csv',
  rowCount: 8,
  completedAt: null,
  discardedAt: new Date('2026-05-11T12:00:00.000Z'),
  finalizedPreparedSetId: null,
  createdCount: null,
  matchedCount: null,
  skippedCount: null,
  invalidCount: null,
};

describe('listImportHistory', () => {
  beforeEach(() => {
    vi.mocked(listImportHistoryPage).mockReset();
  });

  it('maps completed counts that reconcile to rowCount and omits counts on discarded items', async () => {
    vi.mocked(listImportHistoryPage).mockResolvedValue([
      completedRow,
      discardedRow,
    ] as never);

    const page = await listImportHistory('org_1', { limit: 10 });

    expect(page.nextCursor).toBeNull();
    expect(page.data[0]).toMatchObject({
      id: COMPLETED,
      status: 'completed',
      createdCount: 1,
      matchedCount: 1,
      skippedCount: 1,
      invalidCount: 1,
      rowCount: 4,
    });
    expect(
      page.data[0]?.status === 'completed'
        ? page.data[0].createdCount +
            page.data[0].matchedCount +
            page.data[0].skippedCount +
            page.data[0].invalidCount
        : 0
    ).toBe(4);
    expect(page.data[1]).toMatchObject({
      id: DISCARDED,
      status: 'discarded',
      rowCount: 8,
      discardedAt: '2026-05-11T12:00:00.000Z',
    });
    expect(page.data[1]).not.toHaveProperty('createdCount');
    expect(page.data[1]).not.toHaveProperty('matchedCount');
    expect(page.data[1]).not.toHaveProperty('skippedCount');
    expect(page.data[1]).not.toHaveProperty('invalidCount');
  });

  it('returns a cursor when more closed history remains', async () => {
    vi.mocked(listImportHistoryPage).mockResolvedValue([
      completedRow,
      discardedRow,
    ] as never);

    const page = await listImportHistory('org_1', { limit: 1 });

    expect(page.data).toHaveLength(1);
    expect(page.nextCursor).toBe(
      encodeImportHistoryCursor(completedRow.completedAt, COMPLETED)
    );
    expect(listImportHistoryPage).toHaveBeenCalledWith('org_1', {
      limit: 1,
      cursor: undefined,
    });
  });

  it('rejects a malformed history cursor', async () => {
    const err = await listImportHistory('org_1', {
      cursor: 'not-a-cursor',
    }).catch((error: unknown) => error);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'INVALID_CURSOR',
    });
    expect(listImportHistoryPage).not.toHaveBeenCalled();
  });
});
