import { describe, expect, it } from 'vitest';
import type { ImportDraftSummary } from '@ploutizo/types';
import {
  formatDraftAccountLabel,
  formatImportBatchStatusLabel,
  importBatchStatusVariant,
} from './importPresentation';

const draft = {
  id: 'draft_1',
  accountId: 'account_1',
  accountName: 'Travel Visa',
  accountInstitution: 'Amex',
  accountLastFour: '1001',
  source: 'normalized_csv',
  status: 'draft',
  fileName: 'statement.csv',
  rowCount: 4,
  validRowCount: 3,
  invalidRowCount: 1,
  importedAt: '2026-05-20T12:00:00.000Z',
  completedAt: null,
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-20T12:00:00.000Z',
} satisfies ImportDraftSummary;

describe('importPresentation hub helpers', () => {
  it('formats draft account labels', () => {
    expect(formatDraftAccountLabel(draft)).toBe('Travel Visa · Amex · ••1001');
  });

  it('formats batch status labels', () => {
    expect(formatImportBatchStatusLabel('draft')).toBe('Draft');
    expect(formatImportBatchStatusLabel('completed')).toBe('Completed');
    expect(formatImportBatchStatusLabel('discarded')).toBe('Discarded');
  });

  it('maps batch status to badge variants', () => {
    expect(importBatchStatusVariant('completed')).toBe('outline');
    expect(importBatchStatusVariant('discarded')).toBe('secondary');
    expect(importBatchStatusVariant('draft')).toBe('secondary');
  });
});
