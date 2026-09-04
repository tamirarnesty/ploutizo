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
import {
  evaluateImportDraftWorkingCopy,
  rederiveImportDraftWorkingCopy,
} from './rederiveImportDraftWorkingCopy';
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

  it('marks same-import refund rows ready without external facts', async () => {
    const draft = makeImportDraft({
      id: 'draft_same_import_refund',
      refundTargetFacts: {},
      rows: [
        makeImportDraftRow({
          id: 'row_expense',
          reviewType: 'expense',
          parsedType: 'expense',
          reviewAmount: 5000,
          parsedAmount: 5000,
          selectedForImport: true,
        }),
        makeImportDraftRow({
          id: 'row_refund',
          rowNumber: 3,
          reviewType: 'refund',
          parsedType: 'refund',
          reviewAmount: 2000,
          parsedAmount: 2000,
          reviewCategoryId: 'cat_1',
          reviewAssigneeMemberIds: ['member_1'],
          reviewRefundOf: null,
          reviewRefundOfBatchRowId: 'row_expense',
          status: 'needs_review',
          selectedForImport: true,
        }),
      ],
    });

    queryClient.setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    rederiveImportDraftWorkingCopy(draft.id);

    expect(collection.get('row_refund')?.status).toBe('ready');
    const evaluation = evaluateImportDraftWorkingCopy(draft.id)?.get(
      'row_refund'
    );
    expect(evaluation?.blockers).toEqual([]);
    expect(evaluation?.refundLink?.issues).toEqual([]);
  });

  it('marks same-import refund rows needs_review when the target is missing', async () => {
    const draft = makeImportDraft({
      id: 'draft_same_import_missing',
      refundTargetFacts: {},
      rows: [
        makeImportDraftRow({
          id: 'row_refund',
          reviewType: 'refund',
          parsedType: 'refund',
          reviewAmount: 2000,
          parsedAmount: 2000,
          reviewCategoryId: 'cat_1',
          reviewAssigneeMemberIds: ['member_1'],
          reviewRefundOf: null,
          reviewRefundOfBatchRowId: 'row_missing_expense',
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
    const evaluation = evaluateImportDraftWorkingCopy(draft.id)?.get(
      'row_refund'
    );
    expect(evaluation?.blockers).toContain('refund_link');
    expect(evaluation?.refundLink?.issues).toContain('missing_target');
  });

  it('marks existing-expense refund rows needs_review when facts are missing', async () => {
    const expenseId = 'expense_missing_facts';
    const draft = makeImportDraft({
      id: 'draft_missing_facts',
      refundTargetFacts: {},
      rows: [
        makeImportDraftRow({
          id: 'row_refund',
          reviewType: 'refund',
          parsedType: 'refund',
          reviewAmount: 1000,
          parsedAmount: 1000,
          reviewRefundOf: expenseId,
          reviewRefundOfBatchRowId: null,
          reviewCategoryId: 'cat_1',
          reviewAssigneeMemberIds: ['member_1'],
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
    const evaluation = evaluateImportDraftWorkingCopy(draft.id)?.get(
      'row_refund'
    );
    expect(evaluation?.blockers).toContain('refund_link');
    expect(evaluation?.refundLink?.issues).toContain('missing_target');
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
    const evaluation = evaluateImportDraftWorkingCopy(draft.id)?.get(
      'row_refund'
    );
    expect(evaluation?.blockers).toContain('refund_link');
    expect(evaluation?.refundLink?.issues).toContain('wrong_account');
  });

  it('keeps an unselected exact match ready and exposes no accepted-match decision', async () => {
    const draft = makeImportDraft({
      id: 'draft_exact_match',
      matchTargetFacts: {
        tx_1: {
          id: 'tx_1',
          accountId: 'acct_1',
          type: 'expense',
          date: '2026-05-02',
          amount: 4218,
          description: 'Coffee',
          rawDescription: 'Coffee',
          externalId: 'visa-1001',
          deleted: false,
        },
      },
      rows: [
        makeImportDraftRow({
          id: 'row_match',
          externalId: 'visa-1001',
          selectedForImport: false,
        }),
      ],
    });

    queryClient.setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    rederiveImportDraftWorkingCopy(draft.id);

    expect(collection.get('row_match')?.status).toBe('ready');
    expect(collection.get('row_match')?.selectedForImport).toBe(false);
    const evaluation = evaluateImportDraftWorkingCopy(draft.id)?.get(
      'row_match'
    );
    expect(evaluation?.match?.exactCandidate?.kind).toBe('external_id');
    expect(evaluation?.match?.acceptedMatch).toBeNull();
  });

  it('keeps same-import external-ID collisions unresolved until one row is selected', async () => {
    const draft = makeImportDraft({
      id: 'draft_collision',
      rows: [
        makeImportDraftRow({
          id: 'row_a',
          externalId: 'visa-1001',
          selectedForImport: false,
        }),
        makeImportDraftRow({
          id: 'row_b',
          rowNumber: 3,
          externalId: 'visa-1001',
          reviewDescription: 'Coffee copy',
          sourceDescription: 'Coffee copy',
          parsedDescription: 'Coffee copy',
          selectedForImport: false,
        }),
      ],
    });

    queryClient.setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    rederiveImportDraftWorkingCopy(draft.id);

    expect(collection.get('row_a')?.status).toBe('ready');
    expect(collection.get('row_b')?.status).toBe('ready');
    const collisionEvaluation = evaluateImportDraftWorkingCopy(draft.id)?.get(
      'row_a'
    );
    expect(collisionEvaluation?.blockers).not.toContain('match');
    expect(collisionEvaluation?.match?.matchNeedsReview).toBe(true);
    expect(collisionEvaluation?.match?.matchBlocked).toBe(false);

    collection.utils.writeUpdate({
      ...collection.get('row_a')!,
      selectedForImport: true,
    });
    rederiveImportDraftWorkingCopy(draft.id);

    expect(collection.get('row_a')?.status).toBe('ready');
    expect(collection.get('row_b')?.status).toBe('ready');
    expect(
      evaluateImportDraftWorkingCopy(draft.id)?.get('row_a')?.match
        ?.acceptedMatch
    ).toBeNull();
    expect(
      evaluateImportDraftWorkingCopy(draft.id)?.get('row_a')?.match
        ?.matchNeedsReview
    ).toBe(false);
    expect(
      evaluateImportDraftWorkingCopy(draft.id)?.get('row_b')?.match
        ?.matchNeedsReview
    ).toBe(false);
  });

  it('blocks Continue on a selected advisory match until the user decides', async () => {
    const draft = makeImportDraft({
      id: 'draft_advisory_match',
      matchTargetFacts: {
        tx_1: {
          id: 'tx_1',
          accountId: 'acct_1',
          type: 'expense',
          date: '2026-05-02',
          amount: 4218,
          description: 'STARBUCKS STORE 99',
          rawDescription: 'STARBUCKS STORE 99',
          externalId: null,
          deleted: false,
        },
      },
      rows: [
        makeImportDraftRow({
          id: 'row_advisory',
          externalId: null,
          sourceDescription: 'STARBUCKS STORE 123',
          parsedDescription: 'STARBUCKS STORE 123',
          reviewDescription: 'STARBUCKS STORE 123',
          selectedForImport: true,
        }),
      ],
    });

    queryClient.setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    rederiveImportDraftWorkingCopy(draft.id);

    expect(collection.get('row_advisory')?.status).toBe('needs_review');
    const evaluation = evaluateImportDraftWorkingCopy(draft.id)?.get(
      'row_advisory'
    );
    expect(evaluation?.blockers).toContain('match');
    expect(evaluation?.match?.acceptedMatch).toBeNull();
  });
});
