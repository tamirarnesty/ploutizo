import { describe, expect, it } from 'vitest';
import {
  evaluateImportSetRequirements,
  isImportRequirementKey,
  projectImportPreparedOutcome,
} from './import-requirements';
import type { EvaluateImportSetRequirementsInput } from './import-requirements';
import type { ImportDraftDurableRow } from './evaluate-import-draft';
import type { ImportMatchEvaluation } from './import-matches';
import type { ImportRefundLinkEvaluation } from './import-refund-links';

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

const baseInput = (
  overrides: Partial<EvaluateImportSetRequirementsInput> = {}
): EvaluateImportSetRequirementsInput => ({
  rows: [expenseRow()],
  targetAccount: TARGET_ACCOUNT,
  counterpartAccounts: new Map(),
  validAssigneeMemberIds: new Set(['member-1']),
  refundEvaluations: new Map(),
  matchEvaluations: new Map(),
  ...overrides,
});

describe('evaluateImportSetRequirements', () => {
  it('ignores unselected rows', () => {
    const failures = evaluateImportSetRequirements(
      baseInput({
        rows: [
          expenseRow({ selectedForImport: false, reviewCategoryId: null }),
        ],
      })
    );

    expect(failures).toEqual([]);
  });

  it('requires category for expense create candidates', () => {
    const failures = evaluateImportSetRequirements(
      baseInput({ rows: [expenseRow({ reviewCategoryId: null })] })
    );

    expect(failures).toEqual([
      { batchRowId: 'row-expense', key: 'transaction.category.required' },
    ]);
  });

  it('requires at least one live assignee', () => {
    const failures = evaluateImportSetRequirements(
      baseInput({
        rows: [expenseRow({ reviewAssigneeMemberIds: [] })],
      })
    );

    expect(failures).toEqual([
      { batchRowId: 'row-expense', key: 'transaction.assignee.required' },
    ]);
  });

  it('flags unknown assignees with structured params', () => {
    const failures = evaluateImportSetRequirements(
      baseInput({
        rows: [expenseRow({ reviewAssigneeMemberIds: ['member-1', 'gone'] })],
      })
    );

    expect(failures).toEqual([
      {
        batchRowId: 'row-expense',
        key: 'transaction.assignee.unknown',
        params: { memberIds: ['gone'] },
      },
    ]);
  });

  it('maps match issues to namespaced keys', () => {
    const match: ImportMatchEvaluation = {
      acceptedMatch: null,
      acceptedMatchValid: false,
      issues: ['advisory_unresolved'],
      candidates: [],
      exactCandidate: null,
      advisoryCandidates: [],
      collisionRowIds: [],
    };
    const failures = evaluateImportSetRequirements(
      baseInput({
        matchEvaluations: new Map([['row-expense', match]]),
      })
    );

    expect(failures).toContainEqual({
      batchRowId: 'row-expense',
      key: 'import.match.advisory_unresolved',
    });
  });

  it('skips create requirements when a match is accepted', () => {
    const match: ImportMatchEvaluation = {
      acceptedMatch: {
        transactionId: 'tx-1',
        kind: 'external_id',
      },
      acceptedMatchValid: true,
      issues: [],
      candidates: [],
      exactCandidate: null,
      advisoryCandidates: [],
      collisionRowIds: [],
    };
    const failures = evaluateImportSetRequirements(
      baseInput({
        rows: [expenseRow({ reviewCategoryId: null })],
        matchEvaluations: new Map([['row-expense', match]]),
      })
    );

    expect(failures).toEqual([]);
  });

  it('maps linked refund issues to namespaced keys', () => {
    const refund: ImportRefundLinkEvaluation = {
      linked: true,
      valid: false,
      issues: ['target_not_selected'],
      inheritedCategoryId: null,
      inheritedAssigneeMemberIds: [],
    };
    const failures = evaluateImportSetRequirements(
      baseInput({
        rows: [
          expenseRow({
            reviewType: 'refund',
            parsedType: 'refund',
            reviewRefundOfBatchRowId: 'row-expense',
          }),
        ],
        refundEvaluations: new Map([['row-expense', refund]]),
      })
    );

    expect(failures).toEqual([
      {
        batchRowId: 'row-expense',
        key: 'import.refund_link.target_not_selected',
      },
    ]);
  });

  it('rejects settlement rows that use the same account as counterpart', () => {
    const failures = evaluateImportSetRequirements(
      baseInput({
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

    expect(failures).toContainEqual({
      batchRowId: 'row-expense',
      key: 'transaction.account.same_account_not_allowed',
      params: { field: 'counterpartAccountId' },
    });
  });
});

describe('projectImportPreparedOutcome', () => {
  it('classifies structurally invalid rows', () => {
    expect(
      projectImportPreparedOutcome(
        expenseRow({
          selectedForImport: false,
          reviewDate: null,
          parsedDate: null,
          reviewAmount: null,
          parsedAmount: null,
          reviewType: null,
          parsedType: null,
          reviewDescription: null,
          parsedDescription: null,
        }),
        undefined
      )
    ).toBe('invalid');
  });

  it('classifies unselected processable rows as skipped', () => {
    expect(
      projectImportPreparedOutcome(
        expenseRow({ selectedForImport: false }),
        undefined
      )
    ).toBe('skipped');
  });

  it('classifies accepted matches as matched', () => {
    const match: ImportMatchEvaluation = {
      acceptedMatch: { transactionId: 'tx-1', kind: 'external_id' },
      acceptedMatchValid: true,
      issues: [],
      candidates: [],
      exactCandidate: null,
      advisoryCandidates: [],
      collisionRowIds: [],
    };

    expect(projectImportPreparedOutcome(expenseRow(), match)).toBe('matched');
  });

  it('classifies selected create candidates as created', () => {
    expect(projectImportPreparedOutcome(expenseRow(), undefined)).toBe(
      'created'
    );
  });
});

describe('isImportRequirementKey', () => {
  it('accepts known requirement keys', () => {
    expect(isImportRequirementKey('transaction.category.required')).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(isImportRequirementKey('import.legacy.prose_failure')).toBe(false);
  });
});
