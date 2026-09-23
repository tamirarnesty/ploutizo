import { describe, expect, it } from 'vitest';
import { verifyImportSet } from '@ploutizo/utils/import-set-verification';
import type { ImportDraftDurableRow } from '@ploutizo/utils';
import type { ImportSetFacts } from '@ploutizo/utils/import-set-verification';
import { applySelectionMatchDecisionsForImportSet } from '@/services/import-set-facts';

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
  overrides: Partial<ImportSetFacts> = {}
): ImportSetFacts => ({
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

    const withoutOverlay = verifyImportSet(
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

    const verified = verifyImportSet(
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
