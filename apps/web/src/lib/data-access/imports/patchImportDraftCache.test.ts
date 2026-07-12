import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { ImportDraft, ImportDraftRow, ImportDraftSummary } from '@ploutizo/types';
import {
  patchImportDraftRow,
  replaceImportDraftRow,
  restoreImportDraftCache,
} from './patchImportDraftCache';
import { activeImportDraftsQueryKey, importDraftQueryKey } from './queryKeys';

const draftId = '11111111-1111-4111-8111-111111111111';
const rowId = '33333333-3333-4333-8333-333333333333';

const baseRow = (): ImportDraftRow => ({
  id: rowId,
  batchId: draftId,
  rowNumber: 1,
  status: 'needs_review',
  invalidReason: null,
  rawData: {},
  externalId: null,
  sourceDate: '2026-05-02',
  sourceAmount: '42.18',
  sourceDescription: 'Coffee',
  sourceType: 'expense',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense',
  parsedDescription: 'Coffee',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense',
  reviewDescription: 'Coffee',
  reviewCategoryName: null,
  reviewAssigneeHint: null,
  reviewAssigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
  reviewRefundLinkHint: null,
  reviewNotes: null,
  reviewTags: [],
  selectedForImport: false,
  createdAt: '2026-05-20T12:00:00Z',
  updatedAt: '2026-05-20T12:00:00Z',
});

const seedDraft = (row: ImportDraftRow): ImportDraft => ({
  id: draftId,
  accountId: '22222222-2222-4222-8222-222222222222',
  accountName: 'Visa',
  accountInstitution: 'TD',
  accountLastFour: '1234',
  source: 'ploutizo_normalized',
  status: 'draft',
  fileName: 'statement.csv',
  rowCount: 1,
  validRowCount: 1,
  invalidRowCount: 0,
  importedAt: '2026-05-20T12:00:00Z',
  completedAt: null,
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00Z',
  updatedAt: '2026-05-20T12:00:00Z',
  rows: [row],
});

describe('patchImportDraftCache', () => {
  it('recomputes row status after optimistic category patch', () => {
    const qc = new QueryClient();
    qc.setQueryData(importDraftQueryKey(draftId), seedDraft(baseRow()));

    patchImportDraftRow(qc, draftId, rowId, {
      reviewCategoryName: 'Dining',
    });

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    expect(draft?.rows[0]?.status).toBe('ready');
    expect(draft?.rows[0]?.reviewCategoryName).toBe('Dining');
  });

  it('recomputes row status when replacing a row from the server', () => {
    const qc = new QueryClient();
    qc.setQueryData(importDraftQueryKey(draftId), seedDraft(baseRow()));

    replaceImportDraftRow(qc, draftId, {
      ...baseRow(),
      reviewCategoryName: 'Dining',
      status: 'needs_review',
      updatedAt: '2026-05-20T13:00:00Z',
    });

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    expect(draft?.rows[0]?.status).toBe('ready');
  });

  it('restores draft and active summary counts after optimistic patch', () => {
    const qc = new QueryClient();
    const previousDraft = seedDraft(baseRow());
    qc.setQueryData(importDraftQueryKey(draftId), previousDraft);
    qc.setQueryData<ImportDraftSummary[]>(activeImportDraftsQueryKey, [
      {
        id: previousDraft.id,
        accountId: previousDraft.accountId,
        accountName: previousDraft.accountName,
        accountInstitution: previousDraft.accountInstitution,
        accountLastFour: previousDraft.accountLastFour,
        source: previousDraft.source,
        status: previousDraft.status,
        fileName: previousDraft.fileName,
        rowCount: previousDraft.rowCount,
        validRowCount: previousDraft.validRowCount,
        invalidRowCount: previousDraft.invalidRowCount,
        importedAt: previousDraft.importedAt,
        completedAt: previousDraft.completedAt,
        discardedAt: previousDraft.discardedAt,
        createdAt: previousDraft.createdAt,
        updatedAt: previousDraft.updatedAt,
      },
    ]);

    patchImportDraftRow(qc, draftId, rowId, {
      reviewCategoryName: 'Dining',
    });

    restoreImportDraftCache(qc, draftId, previousDraft);

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    const summaries = qc.getQueryData<ImportDraftSummary[]>(
      activeImportDraftsQueryKey
    );

    expect(draft?.rows[0]?.reviewCategoryName).toBeNull();
    expect(draft?.rows[0]?.status).toBe('needs_review');
    expect(summaries?.[0]?.validRowCount).toBe(previousDraft.validRowCount);
  });
});
