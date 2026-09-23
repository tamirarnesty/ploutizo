import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@/lib/errors';
import { continueImportDraft } from '@/services/import-continue';
import { verifyImportSetForDraft } from '@/services/import-set';
import { lockImportDraftBatch } from '@/lib/queries/imports';

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(async (fn) => fn({} as never)),
  },
}));

vi.mock('@/lib/queries/imports', () => ({
  lockImportDraftBatch: vi.fn(),
}));

vi.mock('@/services/import-set', () => ({
  verifyImportSetForDraft: vi.fn(),
}));

describe('continueImportDraft', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lockImportDraftBatch).mockResolvedValue(undefined);
  });

  it('throws IMPORT_CONTINUE_NOT_READY when import set verification fails', async () => {
    vi.mocked(verifyImportSetForDraft).mockResolvedValue({
      ready: false,
      failures: [
        { batchRowId: 'row-expense', key: 'transaction.category.required' },
      ],
    });

    const err = await continueImportDraft({
      orgId: 'org_1',
      batchId: 'batch-1',
      rowIds: ['row-expense'],
    }).catch((error: unknown) => error);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'IMPORT_CONTINUE_NOT_READY',
      details: {
        rows: [
          { batchRowId: 'row-expense', key: 'transaction.category.required' },
        ],
      },
    });
  });
});
