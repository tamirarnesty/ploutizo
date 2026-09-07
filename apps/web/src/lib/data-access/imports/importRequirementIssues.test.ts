import { describe, expect, it } from 'vitest';
import {
  getImportContinueGateMessage,
  getImportContinueNotReadyDetails,
  getImportRequirementFailures,
  getImportRequirementIssueRowIds,
  isImportDomainIssueError,
  isImportStaleFinalizeError,
  summarizeImportRequirementIssues,
} from './importRequirementIssues';

describe('getImportContinueNotReadyDetails', () => {
  it('parses namespaced requirement failures', () => {
    expect(
      getImportContinueNotReadyDetails({
        rows: [
          {
            batchRowId: 'row_1',
            key: 'import.refund_link.cumulative_exceeds',
            params: { cap: 100 },
          },
          {
            batchRowId: 'row_2',
            key: 'not-a-key',
          },
        ],
      })
    ).toEqual({
      rows: [
        {
          batchRowId: 'row_1',
          key: 'import.refund_link.cumulative_exceeds',
          params: { cap: 100 },
        },
      ],
    });
  });
});

describe('getImportContinueGateMessage', () => {
  it('maps duplicate match targets to web-owned copy', () => {
    expect(
      getImportContinueGateMessage({
        error: {
          code: 'IMPORT_CONTINUE_NOT_READY',
          message: 'Some selected rows are not ready to import.',
          details: {
            rows: [
              {
                batchRowId: 'row_1',
                key: 'import.match.duplicate_target',
              },
            ],
          },
        },
      })
    ).toBe('Another selected row already matches this transaction.');
  });

  it('maps requirement keys to web-owned copy', () => {
    expect(
      getImportContinueGateMessage({
        error: {
          code: 'IMPORT_CONTINUE_NOT_READY',
          message: 'Some selected rows are not ready to import.',
          details: {
            rows: [
              {
                batchRowId: 'row_1',
                key: 'import.refund_link.cumulative_exceeds',
              },
            ],
          },
        },
      })
    ).toBe('Linked refunds exceed the original expense amount.');
  });

  it('falls back to the continue error message when details are missing', () => {
    expect(
      getImportContinueGateMessage({
        error: {
          code: 'IMPORT_CONTINUE_NOT_READY',
          message: 'Some selected rows are not ready to import.',
        },
      })
    ).toBe('Some selected rows are not ready to import.');
  });
});

describe('import requirement issue helpers', () => {
  const notReadyError = {
    error: {
      code: 'IMPORT_FINALIZE_NOT_READY',
      message: 'Some selected rows are not ready to import.',
      details: {
        rows: [
          {
            batchRowId: 'row_b',
            key: 'transaction.category.required',
          },
          {
            batchRowId: 'row_a',
            key: 'transaction.date.required',
          },
          {
            batchRowId: 'row_b',
            key: 'transaction.assignee.required',
          },
        ],
      },
    },
  };

  it('summarizes unique copies and preserves first-seen row ids', () => {
    const failures = getImportRequirementFailures(notReadyError);
    expect(summarizeImportRequirementIssues(failures)).toBe(
      'Category is required. Date is required. At least one assignee is required.'
    );
    expect(getImportRequirementIssueRowIds(failures)).toEqual([
      'row_b',
      'row_a',
    ]);
  });

  it('classifies stale finalize failures for a review return', () => {
    expect(isImportDomainIssueError(notReadyError)).toBe(true);
    expect(isImportStaleFinalizeError(notReadyError)).toBe(true);
    expect(
      isImportStaleFinalizeError({
        error: { code: 'IMPORT_FINALIZE_CONFLICT', message: 'Conflict.' },
      })
    ).toBe(true);
    expect(
      isImportStaleFinalizeError({
        error: { code: 'UNKNOWN', message: 'Boom.' },
      })
    ).toBe(false);
  });
});
