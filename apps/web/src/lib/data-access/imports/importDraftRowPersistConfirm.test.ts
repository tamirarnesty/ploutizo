import { describe, expect, it, vi } from 'vitest';
import type { ImportReviewRow } from '@ploutizo/types';
import { makeImportDraftRow } from '@/components/imports/test-fixtures/importDraft';
import { confirmPersistIntoCollection } from './importDraftRowPersistConfirm';

const rederiveMock = vi.hoisted(() => vi.fn());

vi.mock('./rederiveImportDraftWorkingCopy', () => ({
  rederiveImportDraftWorkingCopy: rederiveMock,
  evaluateImportDraftWorkingCopy: vi.fn(),
}));

vi.mock('./mergeImportDraftRefundTargetFacts', () => ({
  applyImportDraftRefundTargetFactDelta: vi.fn(),
}));

const createMockCollection = (initial: ImportReviewRow) => {
  let stored = initial;
  return {
    get: (id: string) => (id === stored.id ? stored : undefined),
    utils: {
      writeUpdate: vi.fn((next: ImportReviewRow) => {
        stored = next;
      }),
    },
  };
};

describe('confirmPersistIntoCollection', () => {
  const draftId = 'draft_confirm_test';

  it('skips writeUpdate when ACK matches live row', () => {
    const row = {
      ...makeImportDraftRow({
        id: 'row_a',
        reviewDescription: 'Coffee',
      }),
      selectedForImport: true,
    };
    const collection = createMockCollection(row);

    confirmPersistIntoCollection(
      collection as never,
      { row: { ...row } },
      row,
      row,
      { reviewDescription: 'Coffee' },
      draftId,
      { deferRederive: true, deferRefundFactsMerge: true }
    );

    expect(collection.utils.writeUpdate).not.toHaveBeenCalled();
  });

  it('writes when server normalizes a patched field', () => {
    const row = {
      ...makeImportDraftRow({
        id: 'row_b',
        reviewDescription: 'coffee',
      }),
      selectedForImport: false,
    };
    const collection = createMockCollection(row);

    confirmPersistIntoCollection(
      collection as never,
      {
        row: {
          ...row,
          reviewDescription: 'Coffee',
        },
      },
      row,
      row,
      { reviewDescription: 'coffee' },
      draftId,
      { deferRederive: true, deferRefundFactsMerge: true }
    );

    expect(collection.utils.writeUpdate).toHaveBeenCalledTimes(1);
    expect(collection.get('row_b')?.reviewDescription).toBe('Coffee');
  });

  it('still runs rederive when write is skipped', () => {
    rederiveMock.mockClear();
    const row = {
      ...makeImportDraftRow({ id: 'row_c', reviewDescription: 'Same' }),
      selectedForImport: false,
    };
    const collection = createMockCollection(row);

    confirmPersistIntoCollection(
      collection as never,
      { row: { ...row } },
      row,
      row,
      { reviewDescription: 'Same' },
      draftId,
      { deferRefundFactsMerge: true }
    );

    expect(collection.utils.writeUpdate).not.toHaveBeenCalled();
    expect(rederiveMock).toHaveBeenCalledWith(draftId);
  });
});
