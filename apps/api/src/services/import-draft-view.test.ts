import { toFinancialInstitutionId } from '@ploutizo/types';
import { describe, expect, it, vi } from 'vitest';
import { buildImportDraftView } from '@/services/import-draft-view';
import {
  listRefundTargetExpensesByIds,
  sumPriorRefundTotalsByTransactionTarget,
} from '@/lib/queries/import-refund-targets';

vi.mock('@/lib/queries/import-refund-targets', () => ({
  listRefundTargetExpensesByIds: vi.fn(),
  sumPriorRefundTotalsByTransactionTarget: vi.fn(),
}));

const summaryRow = {
  id: '11111111-1111-4111-8111-111111111111',
  accountId: '22222222-2222-4222-8222-222222222222',
  accountName: 'Visa',
  accountInstitutionId: 'td',
  accountLastFour: '1234',
  detectedInstitutionId: null,
  status: 'draft' as const,
  fileName: 'statement.csv',
  rowCount: 2,
  importedAt: new Date('2026-05-20T12:00:00Z'),
  completedAt: null,
  discardedAt: null,
  createdAt: new Date('2026-05-20T12:00:00Z'),
  updatedAt: new Date('2026-05-20T12:00:00Z'),
};

const readyRow = {
  id: '33333333-3333-4333-8333-333333333333',
  batchId: summaryRow.id,
  orgId: 'org_1',
  rowNumber: 1,
  rawData: {},
  externalId: null,
  sourceDate: '2026-05-02',
  sourceAmount: '42.18',
  sourceDescription: 'Coffee',
  sourceType: 'expense',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense' as const,
  parsedDescription: 'Coffee',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense' as const,
  reviewDescription: 'Coffee',
  reviewCategoryId: '55555555-5555-4555-8555-555555555555',
  reviewAssigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundLinkHint: null,
  reviewNotes: null,
  reviewTagIds: [],
  selectedForImport: false,
  createdAt: new Date('2026-05-20T12:00:00Z'),
  updatedAt: new Date('2026-05-20T12:00:00Z'),
};

describe('buildImportDraftView', () => {
  it('recomputes summary counts from derived row status', async () => {
    vi.mocked(listRefundTargetExpensesByIds).mockResolvedValue(new Map());

    const invalidRow = {
      ...readyRow,
      id: '44444444-4444-4444-8444-444444444444',
      rowNumber: 2,
      reviewDate: null,
      parsedDate: null,
    };

    const draft = await buildImportDraftView(
      'org_1',
      summaryRow,
      [readyRow, invalidRow],
      (row) => ({
        id: row.id,
        account: {
          id: row.accountId!,
          name: row.accountName,
          institutionId: 'td',
          lastFour: row.accountLastFour,
        },
        detectedInstitutionId: toFinancialInstitutionId(
          row.detectedInstitutionId
        ),
        status: row.status,
        fileName: row.fileName,
        rowCount: row.rowCount,
        validRowCount: 0,
        invalidRowCount: 0,
        importedAt: row.importedAt.toISOString(),
        completedAt: null,
        discardedAt: null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        institutionMismatch: null,
      })
    );

    expect(draft.rows[0]?.status).toBe('ready');
    expect(draft.rows[1]?.status).toBe('invalid');
    expect(draft.validRowCount).toBe(1);
    expect(draft.invalidRowCount).toBe(1);
    expect(draft.rowCount).toBe(2);
    expect(draft.refundTargetFacts).toEqual({});
    expect(sumPriorRefundTotalsByTransactionTarget).not.toHaveBeenCalled();
  });
});
