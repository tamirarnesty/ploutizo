import { describe, expect, it, vi } from 'vitest';
import type { ImportReviewRow } from '@ploutizo/types';
import { makeImportDraftRow } from '@/components/imports/test-fixtures/importDraft';

import { syncImportReviewSelectionOnStatusChange } from './importReviewSelectionSession';

const setImportDraftSelection = vi.fn();

vi.mock('./setImportDraftSelection', () => ({
  setImportDraftSelection: (...args: unknown[]) =>
    setImportDraftSelection(...args),
}));

const row = (overrides: Partial<ImportReviewRow> = {}): ImportReviewRow => ({
  ...makeImportDraftRow({ id: 'row_a', status: 'ready' }),
  selectedForImport: false,
  ...overrides,
});

describe('syncImportReviewSelectionOnStatusChange', () => {
  it('auto-checks a row that becomes ready when the setting is on', () => {
    syncImportReviewSelectionOnStatusChange({
      draftId: 'draft_1',
      rows: [row({ status: 'ready', selectedForImport: false })],
      previousStatusById: new Map([['row_a', 'needs_review']]),
      autoCheckImportRowWhenReady: true,
    });

    expect(setImportDraftSelection).toHaveBeenCalledWith(
      'draft_1',
      ['row_a'],
      true
    );
  });

  it('leaves a row unchecked when it becomes ready and the setting is off', () => {
    setImportDraftSelection.mockClear();
    syncImportReviewSelectionOnStatusChange({
      draftId: 'draft_1',
      rows: [row({ status: 'ready', selectedForImport: false })],
      previousStatusById: new Map([['row_a', 'needs_review']]),
      autoCheckImportRowWhenReady: false,
    });

    expect(setImportDraftSelection).not.toHaveBeenCalledWith(
      'draft_1',
      ['row_a'],
      true
    );
  });

  it('unchecks a checked row that stops being ready', () => {
    setImportDraftSelection.mockClear();
    syncImportReviewSelectionOnStatusChange({
      draftId: 'draft_1',
      rows: [row({ status: 'needs_review', selectedForImport: true })],
      previousStatusById: new Map([['row_a', 'ready']]),
      autoCheckImportRowWhenReady: false,
    });

    expect(setImportDraftSelection).toHaveBeenCalledWith(
      'draft_1',
      ['row_a'],
      false
    );
  });
});
