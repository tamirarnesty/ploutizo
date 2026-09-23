import { describe, expect, it } from 'vitest';
import { buildImportRowSnapshot } from './import-row-snapshot';

const parsedRow = {
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense',
  parsedDescription: 'COFFEE SHOP #42',
  reviewDate: null,
  reviewAmount: null,
  reviewType: null,
  reviewDescription: null,
  reviewCategoryId: 'cat-1',
  reviewAssigneeMemberIds: ['member-1'],
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  reviewNotes: 'weekly',
  reviewTagIds: ['tag-1'],
  externalId: 'visa-1001',
  sourceDescription: 'COFFEE SHOP #42',
};

describe('buildImportRowSnapshot', () => {
  it('trims provenance strings and collapses empty values to null', () => {
    expect(
      buildImportRowSnapshot({
        ...parsedRow,
        externalId: ' visa-1001 ',
        sourceDescription: '   ',
      })
    ).toEqual({
      reviewedValues: expect.objectContaining({
        description: 'COFFEE SHOP #42',
      }),
      provenance: {
        externalId: 'visa-1001',
        rawDescription: null,
        parsedDescription: 'COFFEE SHOP #42',
      },
    });
  });

  it('keeps parsedDescription when the reviewed description differs', () => {
    expect(
      buildImportRowSnapshot({
        ...parsedRow,
        reviewDescription: 'Neighborhood Coffee',
        sourceDescription: null,
      })
    ).toEqual({
      reviewedValues: expect.objectContaining({
        description: 'Neighborhood Coffee',
      }),
      provenance: {
        externalId: 'visa-1001',
        rawDescription: null,
        parsedDescription: 'COFFEE SHOP #42',
      },
    });
  });
});
