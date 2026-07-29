import { describe, expect, it } from 'vitest';
import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import {
  buildImportTypeChangePatch,
  findBillPaymentCategoryId,
} from './importClassification';

describe('importClassification review helpers', () => {
  it('finds the Bill Payment category id', () => {
    expect(
      findBillPaymentCategoryId([
        {
          id: 'cat-1',
          orgId: 'org',
          name: 'Groceries',
          icon: null,
          colour: null,
          sortOrder: 0,
          archivedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'cat-bill',
          orgId: 'org',
          name: BILL_PAYMENT_CATEGORY_NAME,
          icon: null,
          colour: null,
          sortOrder: 1,
          archivedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ])
    ).toBe('cat-bill');
  });

  it('builds type-change patches that clear incompatible fields', () => {
    expect(buildImportTypeChangePatch('refund', 'cat-bill')).toEqual({
      reviewType: 'refund',
      reviewCategoryId: null,
      reviewRefundOf: null,
      reviewRefundOfBatchRowId: null,
      reviewCounterpartAccountId: null,
    });
    expect(buildImportTypeChangePatch('settlement', 'cat-bill')).toEqual({
      reviewType: 'settlement',
      reviewCategoryId: 'cat-bill',
      reviewRefundOf: null,
      reviewRefundOfBatchRowId: null,
      reviewCounterpartAccountId: null,
    });
  });
});
