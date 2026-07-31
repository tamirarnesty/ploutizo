import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { queryClient } from '@/lib/queryClient';
import {
  getImportDraftRowsCollection,
  resetImportDraftRowsCollectionsForTests,
} from './getImportDraftRowsCollection';
import { importDraftQueryKey } from './queryKeys';
import { rederiveImportDraftWorkingCopy } from './rederiveImportDraftWorkingCopy';
import { fetchImportDraft } from './useGetImportDraft';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

describe('rederiveImportDraftWorkingCopy', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(fetchImportDraft).mockReset();
  });

  afterEach(async () => {
    await resetImportDraftRowsCollectionsForTests();
    queryClient.clear();
  });

  it('marks refund rows needs_review when target facts are wrong-account', async () => {
    const expenseId = 'expense_1';
    const draft = makeImportDraft({
      id: 'draft_rederive_1',
      refundTargetFacts: {
        [expenseId]: {
          id: expenseId,
          accountId: 'other_account',
          amount: 5000,
          categoryId: 'cat_1',
          assigneeMemberIds: ['member_1'],
          type: 'expense',
          deleted: false,
        },
      },
      rows: [
        makeImportDraftRow({
          id: 'row_refund',
          reviewType: 'refund',
          parsedType: 'refund',
          reviewRefundOf: expenseId,
          reviewCategoryId: 'cat_1',
          status: 'ready',
          selectedForImport: true,
        }),
      ],
    });

    queryClient.setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    rederiveImportDraftWorkingCopy(draft.id);

    expect(collection.get('row_refund')?.status).toBe('needs_review');
  });
});
