import { describe, expect, it } from 'vitest';
import { verifyImportSet } from './import-set-verification';
import type { ImportSetFacts } from './import-set-verification';
import type { ImportDraftDurableRow } from './evaluate-import-draft';

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
  ...overrides,
});

describe('verifyImportSet', () => {
  it('ignores unselected rows', () => {
    const result = verifyImportSet(
      continueFacts({
        rows: [
          expenseRow({ selectedForImport: false, reviewCategoryId: null }),
        ],
      })
    );

    expect(result.ready).toBe(true);
    if (result.ready) {
      expect(result.projection).toEqual([
        expect.objectContaining({ outcome: 'skipped' }),
      ]);
    }
  });

  it('requires category for expense create candidates', () => {
    const result = verifyImportSet(
      continueFacts({ rows: [expenseRow({ reviewCategoryId: null })] })
    );

    expect(result).toEqual({
      ready: false,
      failures: [
        { batchRowId: 'row-expense', key: 'transaction.category.required' },
      ],
    });
  });

  it('requires at least one live assignee', () => {
    const result = verifyImportSet(
      continueFacts({
        rows: [expenseRow({ reviewAssigneeMemberIds: [] })],
      })
    );

    expect(result).toEqual({
      ready: false,
      failures: [
        { batchRowId: 'row-expense', key: 'transaction.assignee.required' },
      ],
    });
  });

  it('flags unknown assignees with structured params', () => {
    const result = verifyImportSet(
      continueFacts({
        rows: [expenseRow({ reviewAssigneeMemberIds: ['member-1', 'gone'] })],
      })
    );

    expect(result).toEqual({
      ready: false,
      failures: [
        {
          batchRowId: 'row-expense',
          key: 'transaction.assignee.unknown',
          params: { memberIds: ['gone'] },
        },
      ],
    });
  });

  it('maps duplicate match targets to namespaced keys', () => {
    const matchTarget = {
      id: 'tx-1',
      accountId: TARGET_ACCOUNT.id,
      type: 'expense',
      date: '2026-05-02',
      amount: 4218,
      description: 'Coffee',
      rawDescription: 'COFFEE',
      externalId: null,
      deleted: false,
    };
    const result = verifyImportSet(
      continueFacts({
        rowCount: 2,
        rows: [
          expenseRow({
            id: 'row-a',
            reviewMatchedTransactionId: 'tx-1',
          }),
          expenseRow({
            id: 'row-b',
            reviewMatchedTransactionId: 'tx-1',
          }),
        ],
        existingTransactions: [matchTarget],
      })
    );

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.failures).toContainEqual({
        batchRowId: 'row-a',
        key: 'import.match.duplicate_target',
      });
      expect(result.failures).toContainEqual({
        batchRowId: 'row-b',
        key: 'import.match.duplicate_target',
      });
    }
  });

  it('skips create requirements when a match is accepted', () => {
    const matchTarget = {
      id: 'tx-1',
      accountId: TARGET_ACCOUNT.id,
      type: 'expense',
      date: '2026-05-02',
      amount: 4218,
      description: 'Coffee',
      rawDescription: 'COFFEE',
      externalId: 'visa-1001',
      deleted: false,
    };
    const result = verifyImportSet(
      continueFacts({
        rows: [
          expenseRow({
            reviewCategoryId: null,
            externalId: 'visa-1001',
            reviewMatchedTransactionId: 'tx-1',
          }),
        ],
        existingTransactions: [matchTarget],
        activeExternalIdOwners: new Map([['visa-1001', 'tx-1']]),
      })
    );

    expect(result.ready).toBe(true);
    if (result.ready) {
      expect(result.projection[0]).toMatchObject({
        outcome: 'matched',
        transactionId: 'tx-1',
      });
    }
  });

  it('maps linked refund issues to namespaced keys', () => {
    const result = verifyImportSet(
      continueFacts({
        rowCount: 2,
        rows: [
          expenseRow({ selectedForImport: false }),
          expenseRow({
            id: 'row-refund',
            reviewType: 'refund',
            parsedType: 'refund',
            reviewRefundOfBatchRowId: 'row-expense',
          }),
        ],
      })
    );

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.failures).toContainEqual({
        batchRowId: 'row-refund',
        key: 'import.refund_link.target_not_selected',
      });
    }
  });

  it('flags an active ledger owner of a created-row external id', () => {
    const result = verifyImportSet(
      continueFacts({
        rows: [expenseRow({ externalId: 'visa-created' })],
        activeExternalIdOwners: new Map([['visa-created', 'tx-existing']]),
      })
    );

    expect(result).toEqual({
      ready: false,
      failures: [
        {
          batchRowId: 'row-expense',
          key: 'import.external_id.active_conflict',
          params: { transactionId: 'tx-existing', externalId: 'visa-created' },
        },
      ],
    });
  });

  it('does not apply archive-date availability to settlement funding', () => {
    const result = verifyImportSet(
      continueFacts({
        rows: [
          expenseRow({
            reviewType: 'settlement',
            parsedType: 'settlement',
            reviewDate: '2026-06-01',
            reviewCounterpartAccountId: 'funding-1',
          }),
        ],
        counterpartAccounts: new Map([
          [
            'funding-1',
            {
              id: 'funding-1',
              type: 'chequing',
              archivedAt: '2026-01-01',
            } as never,
          ],
        ]),
      })
    );

    expect(result.ready).toBe(true);
  });

  it('rejects settlement rows that use the same account as counterpart', () => {
    const result = verifyImportSet(
      continueFacts({
        rows: [
          expenseRow({
            reviewType: 'settlement',
            parsedType: 'settlement',
            reviewCounterpartAccountId: TARGET_ACCOUNT.id,
          }),
        ],
        counterpartAccounts: new Map([[TARGET_ACCOUNT.id, TARGET_ACCOUNT]]),
      })
    );

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.failures).toContainEqual({
        batchRowId: 'row-expense',
        key: 'transaction.account.same_account_not_allowed',
        params: { field: 'counterpartAccountId' },
      });
    }
  });

  it('projects mixed full-file outcomes that sum to rowCount', () => {
    const createdRow = expenseRow({
      id: 'row-created',
      externalId: 'visa-created',
      sourceDescription: 'NEW MERCHANT',
    });
    const matchedRow = expenseRow({
      id: 'row-matched',
      externalId: 'visa-1001',
      reviewMatchedTransactionId: 'tx-1',
    });
    const skippedRow = expenseRow({
      id: 'row-skipped',
      selectedForImport: false,
    });
    const invalidRow = expenseRow({
      id: 'row-invalid',
      selectedForImport: false,
      reviewDate: null,
      parsedDate: null,
      reviewAmount: null,
      parsedAmount: null,
      reviewType: null,
      parsedType: null,
      reviewDescription: null,
      parsedDescription: null,
    });
    const matchTarget = {
      id: 'tx-1',
      accountId: TARGET_ACCOUNT.id,
      type: 'expense',
      date: '2026-05-02',
      amount: 4218,
      description: 'Coffee',
      rawDescription: 'COFFEE',
      externalId: 'visa-1001',
      deleted: false,
    };

    const result = verifyImportSet(
      continueFacts({
        rowCount: 4,
        rows: [createdRow, matchedRow, skippedRow, invalidRow],
        existingTransactions: [matchTarget],
      })
    );

    expect(result.ready).toBe(true);
    if (result.ready) {
      expect(result.projection).toHaveLength(4);
      expect(result.projection.map((row) => row.outcome).sort()).toEqual(
        ['created', 'invalid', 'matched', 'skipped'].sort()
      );
      expect(
        result.projection.find((row) => row.outcome === 'matched')
      ).toMatchObject({ transactionId: 'tx-1' });
    }
  });
});
