import { describe, expect, it } from 'vitest';
import {
  getImportContinueGateMessage,
  getImportContinueNotReadyDetails,
} from './getImportContinueGateMessage';

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
