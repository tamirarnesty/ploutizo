import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
} from '@ploutizo/types';
import {
  applyServerRowIfNewer,
  patchImportDraftRow,
  patchImportDraftRowsSelection,
  replaceImportDraftRow,
  revertImportDraftRowPatch,
  revertImportDraftRowsSelection,
} from './patchImportDraftCache';
import { activeImportDraftsQueryKey, importDraftQueryKey } from './queryKeys';

const draftId = '11111111-1111-4111-8111-111111111111';
const rowId = '33333333-3333-4333-8333-333333333333';
const rowIdB = '44444444-4444-4444-8444-444444444444';

const baseRow = (overrides: Partial<ImportDraftRow> = {}): ImportDraftRow => ({
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
  reviewCategoryId: null,
  reviewAssigneeMemberIds: ['55555555-5555-4555-8555-555555555555'],
  reviewRefundLinkHint: null,
  reviewNotes: null,
  reviewTagIds: [],
  selectedForImport: false,
  createdAt: '2026-05-20T12:00:00Z',
  updatedAt: '2026-05-20T12:00:00Z',
  ...overrides,
});

const baseRowB = (): ImportDraftRow =>
  baseRow({
    id: rowIdB,
    rowNumber: 2,
    sourceDescription: 'Lunch',
    parsedDescription: 'Lunch',
    reviewDescription: 'Lunch',
  });

const seedDraft = (rows: ImportDraftRow[]): ImportDraft => ({
  id: draftId,
  account: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Visa',
    institution: 'TD',
    lastFour: '1234',
  },
  source: 'ploutizo_normalized',
  status: 'draft',
  fileName: 'statement.csv',
  rowCount: rows.length,
  validRowCount: rows.length,
  invalidRowCount: 0,
  importedAt: '2026-05-20T12:00:00Z',
  completedAt: null,
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00Z',
  updatedAt: '2026-05-20T12:00:00Z',
  rows,
});

const seedActiveSummary = (draft: ImportDraft) => {
  const summary: ImportDraftSummary = {
    id: draft.id,
    account: draft.account,
    source: draft.source,
    status: draft.status,
    fileName: draft.fileName,
    rowCount: draft.rowCount,
    validRowCount: draft.validRowCount,
    invalidRowCount: draft.invalidRowCount,
    importedAt: draft.importedAt,
    completedAt: draft.completedAt,
    discardedAt: draft.discardedAt,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
  return summary;
};

describe('patchImportDraftCache', () => {
  it('recomputes row status when structural fields become invalid', () => {
    const qc = new QueryClient();
    qc.setQueryData(
      importDraftQueryKey(draftId),
      seedDraft([
        baseRow({
          status: 'ready',
          reviewCategoryId: 'cat-dining',
          selectedForImport: true,
          parsedAmount: null,
        }),
      ])
    );

    patchImportDraftRow(qc, draftId, rowId, {
      reviewAmount: null,
    });

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    expect(draft?.rows[0]?.status).toBe('invalid');
    expect(draft?.rows[0]?.reviewAmount).toBeNull();
    expect(draft?.invalidRowCount).toBe(1);
    expect(draft?.validRowCount).toBe(0);
  });

  it('recovers from invalid to ready when structural and review fields are complete', () => {
    const qc = new QueryClient();
    qc.setQueryData(
      importDraftQueryKey(draftId),
      seedDraft([
        baseRow({
          status: 'invalid',
          reviewAmount: null,
          parsedAmount: null,
          reviewCategoryId: 'cat-dining',
          invalidReason: 'Amount must be a positive number.',
        }),
      ])
    );

    patchImportDraftRow(qc, draftId, rowId, {
      reviewAmount: 4218,
    });

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    expect(draft?.rows[0]?.status).toBe('ready');
    expect(draft?.invalidRowCount).toBe(0);
    expect(draft?.validRowCount).toBe(1);
  });

  it('recomputes row status after optimistic category patch', () => {
    const qc = new QueryClient();
    qc.setQueryData(importDraftQueryKey(draftId), seedDraft([baseRow()]));

    patchImportDraftRow(qc, draftId, rowId, {
      reviewCategoryId: 'cat-dining',
    });

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    expect(draft?.rows[0]?.status).toBe('ready');
    expect(draft?.rows[0]?.reviewCategoryId).toBe('cat-dining');
  });

  it('recomputes row status when replacing a row from the server', () => {
    const qc = new QueryClient();
    qc.setQueryData(importDraftQueryKey(draftId), seedDraft([baseRow()]));

    replaceImportDraftRow(qc, draftId, {
      ...baseRow(),
      reviewCategoryId: 'cat-dining',
      status: 'needs_review',
      updatedAt: '2026-05-20T13:00:00Z',
    });

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    expect(draft?.rows[0]?.status).toBe('ready');
  });

  it('reverts only patched row fields after optimistic patch', () => {
    const qc = new QueryClient();
    const previousRow = baseRow();
    const draft = seedDraft([previousRow]);
    qc.setQueryData(importDraftQueryKey(draftId), draft);
    qc.setQueryData<ImportDraftSummary[]>(activeImportDraftsQueryKey, [
      seedActiveSummary(draft),
    ]);

    const body = { reviewCategoryId: 'cat-dining' as const };
    patchImportDraftRow(qc, draftId, rowId, body);

    revertImportDraftRowPatch(qc, draftId, rowId, previousRow, body);

    const restored = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    const summaries = qc.getQueryData<ImportDraftSummary[]>(
      activeImportDraftsQueryKey
    );

    expect(restored?.rows[0]?.reviewCategoryId).toBeNull();
    expect(restored?.rows[0]?.status).toBe('needs_review');
    expect(summaries?.[0]?.validRowCount).toBe(draft.validRowCount);
  });

  it('does not clobber a successful row B edit when rolling back row A', () => {
    const qc = new QueryClient();
    const rowA = baseRow();
    const rowB = baseRowB();
    const draft = seedDraft([rowA, rowB]);
    qc.setQueryData(importDraftQueryKey(draftId), draft);

    const rowABody = { reviewCategoryId: 'cat-dining' as const };
    patchImportDraftRow(qc, draftId, rowId, rowABody);

    const rowBBody = { reviewCategoryId: 'cat-travel' as const };
    patchImportDraftRow(qc, draftId, rowIdB, rowBBody);

    revertImportDraftRowPatch(qc, draftId, rowId, rowA, rowABody);

    const result = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    const restoredA = result?.rows.find((row) => row.id === rowId);
    const successfulB = result?.rows.find((row) => row.id === rowIdB);

    expect(restoredA?.reviewCategoryId).toBeNull();
    expect(restoredA?.status).toBe('needs_review');
    expect(successfulB?.reviewCategoryId).toBe('cat-travel');
    expect(successfulB?.status).toBe('ready');
  });

  it('does not overwrite a newer cache row with a stale server response', () => {
    const qc = new QueryClient();
    const cachedRow = {
      ...baseRow(),
      reviewCategoryId: 'cat-dining',
      status: 'ready' as const,
      updatedAt: '2026-05-20T14:00:00Z',
    };
    qc.setQueryData(importDraftQueryKey(draftId), seedDraft([cachedRow]));

    applyServerRowIfNewer(qc, draftId, {
      ...baseRow(),
      reviewCategoryId: 'cat-travel',
      status: 'needs_review',
      updatedAt: '2026-05-20T13:00:00Z',
    });

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    expect(draft?.rows[0]?.reviewCategoryId).toBe('cat-dining');
    expect(draft?.rows[0]?.status).toBe('ready');
    expect(draft?.rows[0]?.updatedAt).toBe('2026-05-20T14:00:00Z');
  });

  it('reverts only affected row selections', () => {
    const qc = new QueryClient();
    const rowA = baseRow({ selectedForImport: false });
    const rowB = baseRowB();
    rowB.selectedForImport = true;
    qc.setQueryData(importDraftQueryKey(draftId), seedDraft([rowA, rowB]));

    patchImportDraftRow(qc, draftId, rowId, { selectedForImport: true });
    patchImportDraftRow(qc, draftId, rowIdB, {
      reviewCategoryId: 'cat-travel',
    });

    revertImportDraftRowsSelection(
      qc,
      draftId,
      new Map([[rowId, false]]),
      true
    );

    const result = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    const restoredA = result?.rows.find((row) => row.id === rowId);
    const untouchedB = result?.rows.find((row) => row.id === rowIdB);

    expect(restoredA?.selectedForImport).toBe(false);
    expect(untouchedB?.reviewCategoryId).toBe('cat-travel');
    expect(untouchedB?.selectedForImport).toBe(true);
  });

  it('does not clobber a newer same-field success when an older patch fails', () => {
    const qc = new QueryClient();
    const previousRow = baseRow();
    qc.setQueryData(importDraftQueryKey(draftId), seedDraft([previousRow]));

    const olderBody = { reviewCategoryId: 'cat-dining' as const };
    patchImportDraftRow(qc, draftId, rowId, olderBody);

    const newerBody = { reviewCategoryId: 'cat-travel' as const };
    patchImportDraftRow(qc, draftId, rowId, newerBody);
    applyServerRowIfNewer(qc, draftId, {
      ...baseRow(),
      reviewCategoryId: 'cat-travel',
      status: 'ready',
      updatedAt: '2026-05-20T14:00:00Z',
    });

    revertImportDraftRowPatch(qc, draftId, rowId, previousRow, olderBody);

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    expect(draft?.rows[0]?.reviewCategoryId).toBe('cat-travel');
    expect(draft?.rows[0]?.updatedAt).toBe('2026-05-20T14:00:00Z');
  });

  it('does not revert selection when a newer selection already replaced it', () => {
    const qc = new QueryClient();
    qc.setQueryData(
      importDraftQueryKey(draftId),
      seedDraft([baseRow({ selectedForImport: false })])
    );

    // Older mutation optimistically selected the row.
    patchImportDraftRowsSelection(qc, draftId, [rowId], true);
    // Newer mutation deselects and succeeds in cache.
    patchImportDraftRowsSelection(qc, draftId, [rowId], false);

    revertImportDraftRowsSelection(
      qc,
      draftId,
      new Map([[rowId, false]]),
      true
    );

    const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
    expect(draft?.rows[0]?.selectedForImport).toBe(false);
  });
});
