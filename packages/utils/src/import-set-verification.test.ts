import { describe, expect, it } from 'vitest';
import {
  verifyImportSetForContinue,
  verifyPreparedImportSetForFinalize,
} from './import-set-verification';
import { buildPreparedImportRowSnapshot } from './prepared-import-snapshot';
import type {
  ImportContinueDraftFacts,
  ImportFinalizeExternalFacts,
  PreparedImportSetRow,
} from './import-set-verification';
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
  overrides: Partial<ImportContinueDraftFacts> = {}
): ImportContinueDraftFacts => ({
  rowCount: 1,
  rows: [expenseRow()],
  targetAccount: TARGET_ACCOUNT,
  counterpartAccounts: new Map(),
  validAssigneeMemberIds: new Set(['member-1']),
  existingTransactions: [],
  existingExpenses: new Map(),
  ...overrides,
});

const snapshotFromRow = (row: ImportDraftDurableRow) =>
  buildPreparedImportRowSnapshot(row);

describe('verifyImportSetForContinue', () => {
  it('ignores unselected rows', () => {
    const result = verifyImportSetForContinue(
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
    const result = verifyImportSetForContinue(
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
    const result = verifyImportSetForContinue(
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
    const result = verifyImportSetForContinue(
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
    const result = verifyImportSetForContinue(
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
    const result = verifyImportSetForContinue(
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
    const result = verifyImportSetForContinue(
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
    const result = verifyImportSetForContinue(
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

  it('rejects settlement rows that use the same account as counterpart', () => {
    const result = verifyImportSetForContinue(
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

    const result = verifyImportSetForContinue(
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

describe('verifyPreparedImportSetForFinalize', () => {
  const finalizeFacts = (
    overrides: Partial<ImportFinalizeExternalFacts> = {}
  ): ImportFinalizeExternalFacts => ({
    rowCount: 1,
    targetAccount: TARGET_ACCOUNT,
    counterpartAccounts: new Map(),
    validAssigneeMemberIds: new Set(['member-1']),
    existingTransactions: [],
    existingExpenses: new Map(),
    ...overrides,
  });

  const preparedRow = (
    overrides: Partial<PreparedImportSetRow> = {}
  ): PreparedImportSetRow => {
    const row = expenseRow();
    return {
      batchRowId: row.id,
      outcome: 'created',
      transactionId: null,
      snapshot: snapshotFromRow(row),
      ...overrides,
    };
  };

  it('revalidates a prepared create row from its snapshot', () => {
    const result = verifyPreparedImportSetForFinalize(
      [preparedRow()],
      finalizeFacts()
    );

    expect(result).toEqual({ ready: true, verified: [preparedRow()] });
  });

  it('flags deleted matched targets using current external facts', () => {
    const matched = preparedRow({
      batchRowId: 'row-matched',
      outcome: 'matched',
      transactionId: 'tx-1',
      snapshot: snapshotFromRow(
        expenseRow({
          id: 'row-matched',
          reviewMatchedTransactionId: 'tx-1',
          externalId: 'visa-1001',
        })
      ),
    });

    const result = verifyPreparedImportSetForFinalize(
      [matched],
      finalizeFacts({
        existingTransactions: [
          {
            id: 'tx-1',
            accountId: TARGET_ACCOUNT.id,
            type: 'expense',
            date: '2026-05-02',
            amount: 4218,
            description: 'Coffee',
            rawDescription: 'COFFEE',
            externalId: 'visa-1001',
            deleted: true,
          },
        ],
      })
    );

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.failures).toContainEqual({
        batchRowId: 'row-matched',
        key: 'import.match.deleted_target',
      });
    }
  });

  it('flags an external id claimed after Continue', () => {
    const created = preparedRow({
      snapshot: {
        ...snapshotFromRow(expenseRow({ externalId: 'visa-created' })),
      },
    });

    const result = verifyPreparedImportSetForFinalize(
      [created],
      finalizeFacts({
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

  it('rejects matched rows whose stored transaction id no longer matches', () => {
    const matched = preparedRow({
      outcome: 'matched',
      transactionId: 'tx-stale',
      snapshot: snapshotFromRow(
        expenseRow({
          reviewMatchedTransactionId: 'tx-stale',
          externalId: 'visa-1001',
        })
      ),
    });

    const result = verifyPreparedImportSetForFinalize(
      [matched],
      finalizeFacts({
        existingTransactions: [
          {
            id: 'tx-1',
            accountId: TARGET_ACCOUNT.id,
            type: 'expense',
            date: '2026-05-02',
            amount: 4218,
            description: 'Coffee',
            rawDescription: 'COFFEE',
            externalId: 'visa-1001',
            deleted: false,
          },
        ],
      })
    );

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.failures).toContainEqual({
        batchRowId: 'row-expense',
        key: 'import.match.invalidated_decision',
      });
    }
  });

  it('revalidates an identity match against current external facts', () => {
    const matched = preparedRow({
      outcome: 'matched',
      transactionId: 'tx-1',
      snapshot: snapshotFromRow(
        expenseRow({
          reviewMatchedTransactionId: 'tx-1',
          externalId: null,
          sourceDescription: 'COFFEE',
        })
      ),
    });

    const result = verifyPreparedImportSetForFinalize(
      [matched],
      finalizeFacts({
        existingTransactions: [
          {
            id: 'tx-1',
            accountId: TARGET_ACCOUNT.id,
            type: 'expense',
            date: '2026-05-02',
            amount: 4218,
            description: 'Coffee',
            rawDescription: 'COFFEE',
            externalId: null,
            deleted: false,
          },
        ],
      })
    );

    expect(result).toEqual({ ready: true, verified: [matched] });
  });

  it('keeps an identity match when reviewed description differs and rawDescription is null', () => {
    const matched = preparedRow({
      outcome: 'matched',
      transactionId: 'tx-1',
      snapshot: snapshotFromRow(
        expenseRow({
          reviewMatchedTransactionId: 'tx-1',
          externalId: null,
          sourceDescription: null,
          parsedDescription: 'Coffee',
          reviewDescription: 'Neighborhood Coffee',
        })
      ),
    });

    const result = verifyPreparedImportSetForFinalize(
      [matched],
      finalizeFacts({
        existingTransactions: [
          {
            id: 'tx-1',
            accountId: TARGET_ACCOUNT.id,
            type: 'expense',
            date: '2026-05-02',
            amount: 4218,
            description: 'Neighborhood Coffee',
            rawDescription: 'Coffee',
            externalId: null,
            deleted: false,
          },
        ],
      })
    );

    expect(result).toEqual({ ready: true, verified: [matched] });
  });

  it('flags refund cumulative_exceeds against current prior totals', () => {
    const refund = preparedRow({
      batchRowId: 'row-refund',
      snapshot: snapshotFromRow(
        expenseRow({
          id: 'row-refund',
          reviewType: 'refund',
          parsedType: 'refund',
          reviewRefundOf: 'tx-expense',
        })
      ),
    });

    const result = verifyPreparedImportSetForFinalize(
      [refund],
      finalizeFacts({
        existingExpenses: new Map([
          [
            'tx-expense',
            {
              id: 'tx-expense',
              accountId: TARGET_ACCOUNT.id,
              amount: 4218,
              categoryId: 'cat-1',
              assigneeMemberIds: ['member-1'],
              type: 'expense',
              deleted: false,
            },
          ],
        ]),
        priorRefundsByTarget: new Map([['tx:tx-expense', 100]]),
      })
    );

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.failures).toContainEqual({
        batchRowId: 'row-refund',
        key: 'import.refund_link.cumulative_exceeds',
      });
    }
  });

  it('flags a deleted refund expense target', () => {
    const refund = preparedRow({
      batchRowId: 'row-refund',
      snapshot: snapshotFromRow(
        expenseRow({
          id: 'row-refund',
          reviewType: 'refund',
          parsedType: 'refund',
          reviewRefundOf: 'tx-expense',
        })
      ),
    });

    const result = verifyPreparedImportSetForFinalize(
      [refund],
      finalizeFacts({
        existingExpenses: new Map([
          [
            'tx-expense',
            {
              id: 'tx-expense',
              accountId: TARGET_ACCOUNT.id,
              amount: 4218,
              categoryId: 'cat-1',
              assigneeMemberIds: ['member-1'],
              type: 'expense',
              deleted: true,
            },
          ],
        ]),
      })
    );

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.failures).toContainEqual({
        batchRowId: 'row-refund',
        key: 'import.refund_link.deleted_target',
      });
    }
  });

  it('flags assignees removed after Continue', () => {
    const result = verifyPreparedImportSetForFinalize(
      [preparedRow()],
      finalizeFacts({
        validAssigneeMemberIds: new Set(),
      })
    );

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.failures).toContainEqual({
        batchRowId: 'row-expense',
        key: 'transaction.assignee.required',
      });
      expect(result.failures).toContainEqual({
        batchRowId: 'row-expense',
        key: 'transaction.assignee.unknown',
        params: { memberIds: ['member-1'] },
      });
    }
  });

  it('emits a structured failure when prepared rowCount mismatches', () => {
    const result = verifyPreparedImportSetForFinalize(
      [preparedRow()],
      finalizeFacts({ rowCount: 2 })
    );

    expect(result).toEqual({
      ready: false,
      failures: [
        {
          batchRowId: 'row-expense',
          key: 'import.match.invalidated_decision',
        },
      ],
    });
  });

  it('emits a structured failure for an empty prepared set with a nonzero rowCount', () => {
    const result = verifyPreparedImportSetForFinalize([], finalizeFacts());

    expect(result).toEqual({
      ready: false,
      failures: [
        {
          batchRowId: 'unknown',
          key: 'import.match.invalidated_decision',
        },
      ],
    });
  });

  it('rejects a matched row that is missing its transaction id', () => {
    const result = verifyPreparedImportSetForFinalize(
      [
        preparedRow({
          outcome: 'matched',
          transactionId: null,
        }),
      ],
      finalizeFacts()
    );

    expect(result).toEqual({
      ready: false,
      failures: [
        {
          batchRowId: 'row-expense',
          key: 'import.match.invalidated_decision',
        },
      ],
    });
  });

  it('rejects a prepared row whose outcome is not a projection kind', () => {
    const result = verifyPreparedImportSetForFinalize(
      [
        preparedRow({
          outcome: 'unresolved',
        }),
      ],
      finalizeFacts()
    );

    expect(result).toEqual({
      ready: false,
      failures: [
        {
          batchRowId: 'row-expense',
          key: 'import.match.invalidated_decision',
        },
      ],
    });
  });
});
