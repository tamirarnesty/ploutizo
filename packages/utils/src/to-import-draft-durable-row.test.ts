import { describe, expect, it } from 'vitest';
import { buildImportRowSnapshot } from './import-row-snapshot';
import {
  importDraftDurableRowFieldsFrom,
  toImportDraftDurableRow,
} from './to-import-draft-durable-row';
import type { ImportDraftDurableRowSource } from './to-import-draft-durable-row';

const baseSource = (): ImportDraftDurableRowSource => ({
  id: 'row-1',
  reviewDate: '2026-01-15',
  reviewAmount: 2500,
  reviewType: 'expense',
  reviewDescription: 'Coffee',
  parsedDate: '2026-01-15',
  parsedAmount: 2500,
  parsedType: 'expense',
  parsedDescription: 'Coffee',
  reviewCategoryId: 'cat-1',
  reviewAssigneeMemberIds: ['member-1'],
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  reviewNotes: null,
  reviewTagIds: [],
  externalId: null,
  sourceDescription: null,
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
});

describe('importDraftDurableRowFieldsFrom', () => {
  it('deduplicates reviewTagIds while preserving first-seen order', () => {
    const fields = importDraftDurableRowFieldsFrom({
      ...baseSource(),
      reviewTagIds: ['tag-a', 'tag-b', 'tag-a', 'tag-c', 'tag-b'],
    });

    expect(fields.reviewTagIds).toEqual(['tag-a', 'tag-b', 'tag-c']);
  });

  it('feeds deduped tag ids into import row snapshots used at finalize', () => {
    const durable = toImportDraftDurableRow(
      importDraftDurableRowFieldsFrom({
        ...baseSource(),
        reviewTagIds: ['tag-1', 'tag-1'],
      }),
      true
    );

    expect(buildImportRowSnapshot(durable).reviewedValues.tagIds).toEqual([
      'tag-1',
    ]);
  });
});
