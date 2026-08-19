import { describe, expect, it } from 'vitest';
import {
  getImportContinueGateMessage,
  getImportContinueNotReadyDetails,
} from './getImportContinueGateMessage';

describe('getImportContinueNotReadyDetails', () => {
  it('parses per-row continue blocker details', () => {
    expect(
      getImportContinueNotReadyDetails({
        rows: [
          {
            batchRowId: 'row_1',
            status: 'needs_review',
            blockers: ['refund_link', 'unknown'],
            invalidReason: 'Refund exceeds the remaining amount.',
          },
        ],
      })
    ).toEqual({
      rows: [
        {
          batchRowId: 'row_1',
          status: 'needs_review',
          blockers: ['refund_link'],
          invalidReason: 'Refund exceeds the remaining amount.',
        },
      ],
    });
  });
});

describe('getImportContinueGateMessage', () => {
  it('prefers evaluator invalidReason for not-ready continue errors', () => {
    expect(
      getImportContinueGateMessage({
        error: {
          code: 'IMPORT_CONTINUE_NOT_READY',
          message: 'Some selected rows are not ready to import.',
          details: {
            rows: [
              {
                batchRowId: 'row_1',
                status: 'needs_review',
                blockers: ['refund_link'],
                invalidReason:
                  'Refund exceeds the remaining amount on the original expense.',
              },
            ],
          },
        },
      })
    ).toBe('Refund exceeds the remaining amount on the original expense.');
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
