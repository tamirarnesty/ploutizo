import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyImportSetForContinue } from '@ploutizo/utils/import-set-verification';
import type { ImportDraftDurableRow } from '@ploutizo/utils';
import type { ImportContinueDraftFacts } from '@ploutizo/utils/import-set-verification';
import { DomainError } from '@/lib/errors';
import {
  applySelectionMatchDecisionsForImportSet,
  continueImportDraft,
} from '@/services/import-continue';
import { verifyImportDraftProjectionForRowIds } from '@/services/import-draft-projection';
import { lockImportDraftBatch } from '@/lib/queries/imports';

const TARGET_ACCOUNT = { id: 'account-1', type: 'credit_card' as const };

const expenseRow = (
  overrides: Partial<ImportDraftDurableRow> = {}
): ImportDraftDurableRow => ({
  id: 'row-expense',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense',
  reviewDescription: 'Coffee',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense',
  parsedDescription: 'Coffee',
  reviewCategoryId: 'cat-1',
  reviewAssigneeMemberIds: ['member-1'],
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  selectedForImport: true,
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
  externalId: 'visa-1001',
  sourceDescription: null,
  ...overrides,
});

const continueFacts = (
  overrides: Partial<ImportContinueDraftFacts> = {}
): ImportContinueDraftFacts => ({
  rowCount: 1,
  rows: [expenseRow()],
  targetAccount: TARGET_ACCOUNT,
  counterpartAccounts: new Map(),
  validAssigneeMemberIds: new Set(['member-1']),
  existingTransactions: [],
  existingExpenses: new Map(),
  priorRefundsByTarget: new Map(),
  activeExternalIdOwners: new Map(),
  ...overrides,
});

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(async (fn) => fn({} as never)),
  },
}));

vi.mock('@/lib/queries/imports', () => ({
  lockImportDraftBatch: vi.fn(),
}));

vi.mock('@/services/import-draft-projection', () => ({
  verifyImportDraftProjectionForRowIds: vi.fn(),
}));

describe('continueImportDraft', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lockImportDraftBatch).mockResolvedValue(undefined);
  });

  it('throws IMPORT_CONTINUE_NOT_READY when projection verification fails', async () => {
    vi.mocked(verifyImportDraftProjectionForRowIds).mockResolvedValue({
      ready: false,
      failures: [
        { batchRowId: 'row-expense', key: 'transaction.category.required' },
      ],
    });

    const err = await continueImportDraft('org_1', 'batch-1', [
      'row-expense',
    ]).catch((error: unknown) => error);

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

describe('applySelectionMatchDecisionsForImportSet', () => {
  it('derives exact ledger matches for selected rows without persisted match ids', () => {
    const matchTarget = {
      id: 'tx-1',
      accountId: TARGET_ACCOUNT.id,
      type: 'expense' as const,
      date: '2026-05-02',
      amount: 4218,
      description: 'Coffee',
      rawDescription: 'COFFEE',
      externalId: 'visa-1001',
      deleted: false,
    };
    const selectedRowIds = new Set(['row-expense']);
    const row = expenseRow({
      selectedForImport: true,
      reviewMatchedTransactionId: null,
    });

    const withoutOverlay = verifyImportSetForContinue(
      continueFacts({
        rows: [row],
        existingTransactions: [matchTarget],
        activeExternalIdOwners: new Map(),
      })
    );
    expect(withoutOverlay.ready).toBe(true);
    if (withoutOverlay.ready) {
      expect(withoutOverlay.projection[0]).toMatchObject({
        outcome: 'created',
      });
    }

    const rowsWithMatch = applySelectionMatchDecisionsForImportSet(
      [row],
      selectedRowIds,
      TARGET_ACCOUNT.id,
      [matchTarget]
    );

    const verified = verifyImportSetForContinue(
      continueFacts({
        rows: rowsWithMatch,
        existingTransactions: [matchTarget],
        activeExternalIdOwners: new Map([['visa-1001', 'tx-1']]),
      })
    );

    expect(verified.ready).toBe(true);
    if (verified.ready) {
      expect(verified.projection[0]).toMatchObject({
        outcome: 'matched',
        transactionId: 'tx-1',
      });
    }
  });
});
