import { describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/queryClient';
import { fetchUpdateImportDraftRows } from './fetchUpdateImportDraftRows';

vi.mock('@/lib/queryClient', () => ({
  apiFetch: vi.fn(),
}));

describe('fetchUpdateImportDraftRows', () => {
  it('maps route JSON { data: rows[], refundTargetFacts? } to batch result', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          batchId: '11111111-1111-4111-8111-111111111111',
          rowNumber: 1,
          reviewAmount: 100,
        },
      ],
      refundTargetFacts: {
        '99999999-9999-4999-8999-999999999999': {
          id: '99999999-9999-4999-8999-999999999999',
          accountId: '22222222-2222-4222-8222-222222222222',
          amount: 50,
          categoryId: null,
          assigneeMemberIds: [],
          type: 'expense',
          deleted: false,
        },
      },
    });

    const result = await fetchUpdateImportDraftRows(
      '11111111-1111-4111-8111-111111111111',
      [
        {
          id: '33333333-3333-4333-8333-333333333333',
          reviewAmount: 100,
        },
      ]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.reviewAmount).toBe(100);
    expect(result.refundTargetFacts).toBeDefined();
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/imports/drafts/11111111-1111-4111-8111-111111111111/rows',
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
