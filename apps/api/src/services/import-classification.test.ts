import { describe, expect, it } from 'vitest';
import {
  applyInitialImportClassification,
  deriveTypeChangeSideEffects,
} from './import-classification';
import type { ParsedImportRow } from '@/lib/imports/normalizedCsv';

const baseParsedRow = {
  rowNumber: 2,
  status: 'needs_review' as const,
  invalidReason: null,
  rawData: {},
  externalId: null,
  sourceDate: '2026-05-02',
  sourceAmount: '10.00',
  sourceDescription: 'TIM HORTONS #1',
  sourceType: 'expense',
  parsedDate: '2026-05-02',
  parsedAmount: 1000,
  parsedType: 'expense' as const,
  parsedDescription: 'TIM HORTONS #1',
  reviewDate: '2026-05-02',
  reviewAmount: 1000,
  reviewType: 'expense' as const,
  reviewDescription: 'TIM HORTONS #1',
  reviewRefundLinkHint: null,
  reviewNotes: null,
  csvCategoryName: null,
  csvAssigneeName: null,
  csvTagNames: [],
} satisfies ParsedImportRow;

describe('import classification helpers', () => {
  it('applies merchant rules and ownership defaults once for upload', () => {
    const classified = applyInitialImportClassification(
      baseParsedRow,
      {
        reviewCategoryId: null,
        reviewAssigneeMemberIds: [],
        reviewTagIds: [],
      },
      {
        merchantRules: [
          {
            pattern: 'TIM HORTONS',
            matchType: 'contains',
            renameTo: 'Tim Hortons',
            categoryId: 'cat-dining',
            assigneeId: null,
            tagIds: [],
          },
        ],
        billPaymentCategoryId: 'cat-bill',
        accountOwnerMemberIds: ['owner-1', 'owner-2'],
      }
    );

    expect(classified).toMatchObject({
      reviewType: 'expense',
      reviewDescription: 'Tim Hortons',
      reviewCategoryId: 'cat-dining',
      reviewAssigneeMemberIds: ['owner-1', 'owner-2'],
      status: 'ready',
    });
  });

  it('detects bill payments as settlements with Bill Payment category', () => {
    const classified = applyInitialImportClassification(
      {
        ...baseParsedRow,
        sourceDescription: 'PAYMENT THANK YOU',
        parsedDescription: 'PAYMENT THANK YOU',
        reviewDescription: 'PAYMENT THANK YOU',
      },
      {
        reviewCategoryId: null,
        reviewAssigneeMemberIds: [],
        reviewTagIds: [],
      },
      {
        merchantRules: [],
        billPaymentCategoryId: 'cat-bill',
        accountOwnerMemberIds: ['owner-1'],
      }
    );

    expect(classified.reviewType).toBe('settlement');
    expect(classified.reviewCategoryId).toBe('cat-bill');
    expect(classified.status).toBe('needs_review');
  });

  it('clears incompatible fields on type change and sets Bill Payment for settlement', () => {
    expect(deriveTypeChangeSideEffects('settlement', 'cat-bill')).toEqual({
      reviewCategoryId: 'cat-bill',
      reviewRefundOf: null,
      reviewRefundOfBatchRowId: null,
      reviewCounterpartAccountId: null,
    });
    expect(deriveTypeChangeSideEffects('expense', 'cat-bill')).toEqual({
      reviewCategoryId: null,
      reviewRefundOf: null,
      reviewRefundOfBatchRowId: null,
      reviewCounterpartAccountId: null,
    });
  });
});
