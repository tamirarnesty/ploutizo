import { describe, expect, it, vi } from 'vitest';
import { verifyImportSet } from '@ploutizo/utils/import-set-verification';
import type { ImportDraftDurableRow } from '@ploutizo/utils';
import type { ImportSetFacts } from '@ploutizo/utils/import-set-verification';
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import {
  applySelectionMatchDecisionsForImportSet,
  loadImportSetFacts,
} from '@/services/import-set-facts';
import {
  fetchAccountWriteReference,
  listCategoryIdsInOrg,
  listTagIdsInOrg,
} from '@/lib/queries/scope';

vi.mock('@/lib/queries/scope', () => ({
  fetchAccountWriteReference: vi.fn(),
  listCategoryIdsInOrg: vi.fn(),
  listTagIdsInOrg: vi.fn(),
}));

vi.mock('@/lib/queries/households', () => ({
  listOrgMembers: vi.fn().mockResolvedValue([{ id: 'member-1' }]),
}));

vi.mock('@/lib/queries/import-match-targets', () => ({
  listActiveExternalIdOwners: vi.fn().mockResolvedValue(new Map()),
  listImportMatchTargets: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('@/lib/queries/import-refund-targets', () => ({
  listRefundTargetExpensesByIds: vi.fn().mockResolvedValue(new Map()),
  sumPriorRefundTotalsByTransactionTarget: vi.fn().mockResolvedValue(new Map()),
}));

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
  reviewNotes: null,
  reviewTagIds: [],
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
  validCategoryIds: new Set(['cat-1']),
  validTagIds: new Set(),
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

describe('loadImportSetFacts', () => {
  const draftRecord = (
    overrides: Partial<ImportDraftRowRecord>
  ): ImportDraftRowRecord =>
    ({
      ...expenseRow(),
      externalId: null,
      reviewNotes: null,
      reviewTagIds: [],
      ...overrides,
    }) as unknown as ImportDraftRowRecord;

  it('loads referenced category and tag ids and keeps reviewed notes and tags on rows', async () => {
    vi.mocked(fetchAccountWriteReference).mockResolvedValue({
      id: TARGET_ACCOUNT.id,
      type: 'credit_card',
      archivedAt: null,
    });
    vi.mocked(listCategoryIdsInOrg).mockResolvedValue(new Set(['cat-1']));
    vi.mocked(listTagIdsInOrg).mockResolvedValue(new Set(['tag-1']));
    const tx = {} as never;

    const facts = await loadImportSetFacts(tx, {
      orgId: 'org_1',
      accountId: TARGET_ACCOUNT.id,
      rowCount: 2,
      draftRows: [
        draftRecord({
          id: 'row-a',
          reviewNotes: 'weekly',
          reviewTagIds: ['tag-1', 'tag-2'],
        }),
        draftRecord({
          id: 'row-b',
          reviewCategoryId: 'cat-2',
          reviewTagIds: ['tag-1'],
        }),
      ],
      selectedRowIds: new Set(['row-a', 'row-b']),
    });

    expect(listCategoryIdsInOrg).toHaveBeenCalledWith(
      'org_1',
      ['cat-1', 'cat-2'],
      tx
    );
    expect(listTagIdsInOrg).toHaveBeenCalledWith(
      'org_1',
      ['tag-1', 'tag-2', 'tag-1'],
      tx
    );
    expect(facts.validCategoryIds).toEqual(new Set(['cat-1']));
    expect(facts.validTagIds).toEqual(new Set(['tag-1']));
    expect(
      facts.rows.map(({ id, reviewNotes, reviewTagIds }) => ({
        id,
        reviewNotes,
        reviewTagIds,
      }))
    ).toEqual([
      { id: 'row-a', reviewNotes: 'weekly', reviewTagIds: ['tag-1', 'tag-2'] },
      { id: 'row-b', reviewNotes: null, reviewTagIds: ['tag-1'] },
    ]);
  });
});
