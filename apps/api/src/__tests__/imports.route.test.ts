import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouteTestApp } from './testUtils';
import type { AppEnv } from '@/types';
import { importsRouter } from '@/routes/imports';
import {
  createImportDraft,
  discardImportDraft,
  listImportTargets,
  updateImportDraftRow,
  updateImportDraftRowSelection,
} from '@/services/imports';
import { listImportHistory } from '@/services/import-history';
import {
  continueImportDraft,
  getActiveImportPreparedConfirmation,
  invalidateImportPreparedSet,
} from '@/services/import-prepared-sets';
import { finalizeImportDraft } from '@/services/import-finalize';

vi.mock('@/services/imports', () => ({
  createImportDraft: vi.fn(),
  discardImportDraft: vi.fn(),
  getImportDraft: vi.fn(),
  getImportExampleCsv: vi.fn(() => 'date,amount,description,type\n'),
  listActiveImportDrafts: vi.fn(() => []),
  listImportTargets: vi.fn(),
  updateImportDraftRow: vi.fn(),
  updateImportDraftRowSelection: vi.fn(),
}));

vi.mock('@/services/import-history', () => ({
  listImportHistory: vi.fn(() => ({ data: [], nextCursor: null })),
}));

vi.mock('@/services/import-prepared-sets', () => ({
  continueImportDraft: vi.fn(),
  getActiveImportPreparedConfirmation: vi.fn(),
  invalidateImportPreparedSet: vi.fn(),
}));

vi.mock('@/services/import-finalize', () => ({
  finalizeImportDraft: vi.fn(),
}));

const app = createRouteTestApp<AppEnv>((testApp) => {
  testApp.use('*', async (c, next) => {
    c.set('orgId', 'org_1');
    await next();
  });
  testApp.route('/', importsRouter);
});

const PREPARED_SET_ID = '550e8400-e29b-41d4-a716-446655440060';
const OTHER_PREPARED_SET_ID = '550e8400-e29b-41d4-a716-446655440061';

describe('imports router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('returns import targets from the service', async () => {
    vi.mocked(listImportTargets).mockResolvedValue([
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Visa',
        institutionId: 'td',
        lastFour: '1234',
      },
    ]);

    const res = await app.request('/targets');
    const body = (await res.json()) as { data: { name: string }[] };

    expect(res.status).toBe(200);
    expect(body.data[0].name).toBe('Visa');
  });

  it('creates an import draft with a normalized CSV payload', async () => {
    vi.mocked(createImportDraft).mockResolvedValue({
      kind: 'draft',
      data: { id: 'draft_1', rows: [] } as never,
      meta: { reusedExisting: false },
    });

    const res = await app.request('/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: '22222222-2222-4222-8222-222222222222',
        fileName: 'statement.csv',
        content:
          'date,amount,description,type\n2026-05-02,42.18,Coffee,expense',
        selection: { kind: 'profile', profileId: 'internal' },
      }),
    });

    expect(res.status).toBe(201);
    expect(createImportDraft).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({ fileName: 'statement.csv' })
    );
  });

  it('returns an existing draft when createImportDraft reuses one', async () => {
    vi.mocked(createImportDraft).mockResolvedValue({
      kind: 'draft',
      data: { id: 'draft_1', rows: [] } as never,
      meta: { reusedExisting: true },
    });

    const res = await app.request('/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: '22222222-2222-4222-8222-222222222222',
        fileName: 'statement.csv',
        content:
          'date,amount,description,type\n2026-05-02,42.18,Coffee,expense',
        selection: { kind: 'profile', profileId: 'internal' },
      }),
    });
    const body = (await res.json()) as {
      kind: 'draft';
      data: { id: string };
      meta: { reusedExisting: boolean };
    };

    expect(res.status).toBe(200);
    expect(body.meta.reusedExisting).toBe(true);
    expect(body.data.id).toBe('draft_1');
  });

  it('auto-detects a profile when selection is omitted', async () => {
    vi.mocked(createImportDraft).mockResolvedValue({
      kind: 'draft',
      data: { id: 'draft_1', rows: [] } as never,
      meta: { reusedExisting: false },
    });

    const res = await app.request('/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: '22222222-2222-4222-8222-222222222222',
        fileName: 'statement.csv',
        content:
          'date,amount,description,type\n2026-05-02,42.18,Coffee,expense',
      }),
    });

    expect(res.status).toBe(201);
    expect(createImportDraft).toHaveBeenCalledWith(
      'org_1',
      expect.not.objectContaining({ selection: expect.anything() })
    );
  });

  it('returns mapping_required when auto-detection needs a member choice', async () => {
    vi.mocked(createImportDraft).mockResolvedValue({
      kind: 'mapping_required',
      candidateProfileIds: ['mdy_debit_credit_balance'],
      columns: ['Column 1', 'Column 2', 'Column 3', 'Column 4', 'Column 5'],
      sampleRows: [['05/02/2026', 'GROCERY', '12.34', '', '100.00']],
    });

    const res = await app.request('/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: '22222222-2222-4222-8222-222222222222',
        fileName: 'statement.csv',
        content:
          '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,100.00\n05/08/2026,MERCHANT CREDIT,,5.00,105.00',
      }),
    });
    const body = (await res.json()) as {
      kind: 'mapping_required';
      candidateProfileIds: string[];
    };

    expect(res.status).toBe(200);
    expect(body.kind).toBe('mapping_required');
    expect(body.candidateProfileIds).toEqual(['mdy_debit_credit_balance']);
  });

  it('validates row patch payloads before updating a draft row', async () => {
    vi.mocked(updateImportDraftRow).mockResolvedValue({
      row: { id: 'row_1' } as never,
    });

    const bad = await app.request('/rows/row_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewAmount: -1 }),
    });
    expect(bad.status).toBe(400);

    const badDate = await app.request('/rows/row_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewDate: '2026-02-30' }),
    });
    expect(badDate.status).toBe(400);

    const good = await app.request('/rows/row_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewCategoryId: '55555555-5555-4555-8555-555555555555',
        reviewAssigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
      }),
    });
    expect(good.status).toBe(200);
    expect(updateImportDraftRow).toHaveBeenCalledWith('org_1', 'row_1', {
      reviewCategoryId: '55555555-5555-4555-8555-555555555555',
      reviewAssigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
    });
  });

  it('accepts row selection patch payloads', async () => {
    vi.mocked(updateImportDraftRow).mockResolvedValue({
      row: {
        id: 'row_1',
        selectedForImport: true,
      } as never,
    });

    const res = await app.request('/rows/row_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedForImport: true }),
    });

    expect(res.status).toBe(200);
    expect(updateImportDraftRow).toHaveBeenCalledWith('org_1', 'row_1', {
      selectedForImport: true,
    });
  });

  it('accepts batch row selection patch payloads', async () => {
    vi.mocked(updateImportDraftRowSelection).mockResolvedValue([
      { id: 'row_1', selectedForImport: true },
      { id: 'row_2', selectedForImport: true },
    ] as never);

    const res = await app.request('/drafts/draft_1/rows/selection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rowIds: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
        selectedForImport: true,
      }),
    });

    expect(res.status).toBe(200);
    expect(updateImportDraftRowSelection).toHaveBeenCalledWith(
      'org_1',
      'draft_1',
      {
        rowIds: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
        selectedForImport: true,
      }
    );
  });

  it('discards an active draft', async () => {
    vi.mocked(discardImportDraft).mockResolvedValue({ id: 'draft_1' });

    const res = await app.request('/drafts/draft_1', { method: 'DELETE' });

    expect(res.status).toBe(200);
    expect(discardImportDraft).toHaveBeenCalledWith('org_1', 'draft_1');
  });

  it('continues an import draft into a prepared set revision', async () => {
    vi.mocked(continueImportDraft).mockResolvedValue({
      id: 'prep_1',
      batchId: 'draft_1',
      revision: 1,
      createdAt: '2026-05-20T12:00:00.000Z',
    });

    const res = await app.request('/drafts/draft_1/continue', {
      method: 'POST',
    });
    const body = (await res.json()) as {
      data: { id: string; revision: number };
    };

    expect(res.status).toBe(201);
    expect(continueImportDraft).toHaveBeenCalledWith('org_1', 'draft_1');
    expect(body.data).toEqual({
      id: 'prep_1',
      batchId: 'draft_1',
      revision: 1,
      createdAt: '2026-05-20T12:00:00.000Z',
    });
    expect(body.data).not.toHaveProperty('outcomes');
  });

  it('returns structured continue failures from the service', async () => {
    const { DomainError } = await import('@/lib/errors');
    vi.mocked(continueImportDraft).mockRejectedValue(
      new DomainError(
        400,
        'Some selected rows are not ready to import.',
        'IMPORT_CONTINUE_NOT_READY',
        {
          rows: [
            {
              batchRowId: '11111111-1111-4111-8111-111111111111',
              key: 'transaction.category.required',
            },
          ],
        }
      )
    );

    const res = await app.request('/drafts/draft_1/continue', {
      method: 'POST',
    });
    const body = (await res.json()) as {
      error: {
        code: string;
        details?: { rows: { key: string }[] };
      };
    };

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('IMPORT_CONTINUE_NOT_READY');
    expect(body.error.details?.rows[0]?.key).toBe(
      'transaction.category.required'
    );
  });

  it('returns the active prepared confirmation DTO', async () => {
    vi.mocked(getActiveImportPreparedConfirmation).mockResolvedValue({
      id: 'prep_1',
      batchId: 'draft_1',
      revision: 1,
      createdAt: '2026-05-20T12:00:00.000Z',
      rowCount: 4,
      counts: { created: 1, matched: 1, skipped: 1, invalid: 1 },
      created: [],
      matched: [],
    });

    const res = await app.request('/drafts/draft_1/prepared');
    const body = (await res.json()) as {
      data: { revision: number; counts: { created: number } };
    };

    expect(res.status).toBe(200);
    expect(getActiveImportPreparedConfirmation).toHaveBeenCalledWith(
      'org_1',
      'draft_1'
    );
    expect(body.data.counts.created).toBe(1);
  });

  it('invalidates active prepared staging', async () => {
    vi.mocked(invalidateImportPreparedSet).mockResolvedValue(undefined);

    const res = await app.request('/drafts/draft_1/prepared', {
      method: 'DELETE',
    });

    expect(res.status).toBe(204);
    expect(invalidateImportPreparedSet).toHaveBeenCalledWith(
      'org_1',
      'draft_1'
    );
  });

  it('404s prepared reads when the active revision has no prepared set', async () => {
    const { NotFoundError } = await import('@/lib/errors');
    vi.mocked(getActiveImportPreparedConfirmation).mockRejectedValue(
      new NotFoundError('Prepared import set not found.')
    );

    const res = await app.request('/drafts/draft_1/prepared');

    expect(res.status).toBe(404);
    expect(getActiveImportPreparedConfirmation).toHaveBeenCalledWith(
      'org_1',
      'draft_1'
    );
  });

  it('404s prepared reads for another org’s draft', async () => {
    const { NotFoundError } = await import('@/lib/errors');
    vi.mocked(getActiveImportPreparedConfirmation).mockRejectedValue(
      new NotFoundError('Import draft not found.')
    );

    const res = await app.request('/drafts/draft_1/prepared');

    expect(res.status).toBe(404);
    expect(getActiveImportPreparedConfirmation).toHaveBeenCalledWith(
      'org_1',
      'draft_1'
    );
  });

  it('404s continue for a missing org-scoped draft', async () => {
    const { NotFoundError } = await import('@/lib/errors');
    vi.mocked(continueImportDraft).mockRejectedValue(
      new NotFoundError('Import draft not found.')
    );

    const res = await app.request('/drafts/missing/continue', {
      method: 'POST',
    });

    expect(res.status).toBe(404);
  });

  it('finalizes an explicit prepared set', async () => {
    vi.mocked(finalizeImportDraft).mockResolvedValue({
      id: 'draft_1',
      account: {
        id: 'acct_1',
        name: 'Visa',
        institutionId: 'td',
        lastFour: '1234',
      },
      contentProfileId: 'internal',
      status: 'completed',
      fileName: 'statement.csv',
      rowCount: 4,
      createdCount: 1,
      matchedCount: 1,
      skippedCount: 1,
      invalidCount: 1,
      importedAt: '2026-05-20T12:00:00.000Z',
      completedAt: '2026-05-21T12:00:00.000Z',
      discardedAt: null,
      createdAt: '2026-05-20T12:00:00.000Z',
      updatedAt: '2026-05-21T12:00:00.000Z',
      preparedSetId: PREPARED_SET_ID,
    });

    const res = await app.request('/drafts/draft_1/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preparedSetId: PREPARED_SET_ID }),
    });
    const body = (await res.json()) as {
      data: { preparedSetId: string; createdCount: number };
    };

    expect(res.status).toBe(200);
    expect(finalizeImportDraft).toHaveBeenCalledWith(
      'org_1',
      'draft_1',
      PREPARED_SET_ID
    );
    expect(body.data.preparedSetId).toBe(PREPARED_SET_ID);
    expect(body.data.createdCount).toBe(1);
  });

  it('rejects finalize without an explicit preparedSetId', async () => {
    const res = await app.request('/drafts/draft_1/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(finalizeImportDraft).not.toHaveBeenCalled();
  });

  it('returns structured finalize failures from the service', async () => {
    const { DomainError } = await import('@/lib/errors');
    vi.mocked(finalizeImportDraft).mockRejectedValue(
      new DomainError(
        400,
        'Some selected rows are not ready to import.',
        'IMPORT_FINALIZE_NOT_READY',
        {
          rows: [
            {
              batchRowId: '11111111-1111-4111-8111-111111111111',
              key: 'import.external_id.active_conflict',
            },
          ],
        }
      )
    );

    const res = await app.request('/drafts/draft_1/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preparedSetId: PREPARED_SET_ID }),
    });
    const body = (await res.json()) as {
      error: { code: string; details?: { rows: { key: string }[] } };
    };

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('IMPORT_FINALIZE_NOT_READY');
    expect(body.error.details?.rows[0]?.key).toBe(
      'import.external_id.active_conflict'
    );
  });

  it('returns a conflict when finalize aliases another revision', async () => {
    const { DomainError } = await import('@/lib/errors');
    vi.mocked(finalizeImportDraft).mockRejectedValue(
      new DomainError(
        409,
        'This prepared import set cannot be finalized.',
        'IMPORT_FINALIZE_CONFLICT'
      )
    );

    const res = await app.request('/drafts/draft_1/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preparedSetId: OTHER_PREPARED_SET_ID }),
    });
    const body = (await res.json()) as { error: { code: string } };

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('IMPORT_FINALIZE_CONFLICT');
  });

  it('404s finalize for another org’s draft', async () => {
    const { NotFoundError } = await import('@/lib/errors');
    vi.mocked(finalizeImportDraft).mockRejectedValue(
      new NotFoundError('Import draft not found.')
    );

    const res = await app.request('/drafts/draft_1/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preparedSetId: PREPARED_SET_ID }),
    });

    expect(res.status).toBe(404);
  });

  it('rejects a non-uuid preparedSetId before calling the service', async () => {
    const res = await app.request('/drafts/draft_1/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preparedSetId: 'prep_1' }),
    });

    expect(res.status).toBe(400);
    expect(finalizeImportDraft).not.toHaveBeenCalled();
  });

  it('returns INTERNAL_ERROR for unexpected finalize failures', async () => {
    vi.mocked(finalizeImportDraft).mockRejectedValue(
      new Error('connection reset')
    );

    const res = await app.request('/drafts/draft_1/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preparedSetId: PREPARED_SET_ID }),
    });
    const body = (await res.json()) as { error: { code: string } };

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns cursor-paginated completed and discarded history', async () => {
    vi.mocked(listImportHistory).mockResolvedValue({
      data: [
        {
          id: 'completed_1',
          account: {
            id: 'acct_1',
            name: 'Visa',
            institutionId: 'td',
            lastFour: '1234',
          },
          contentProfileId: 'internal',
          status: 'completed',
          fileName: 'statement.csv',
          rowCount: 4,
          createdCount: 1,
          matchedCount: 1,
          skippedCount: 1,
          invalidCount: 1,
          importedAt: '2026-05-20T12:00:00.000Z',
          completedAt: '2026-05-21T12:00:00.000Z',
          discardedAt: null,
          createdAt: '2026-05-20T12:00:00.000Z',
          updatedAt: '2026-05-21T12:00:00.000Z',
        },
        {
          id: 'discarded_1',
          account: {
            id: 'acct_1',
            name: 'Visa',
            institutionId: 'td',
            lastFour: '1234',
          },
          contentProfileId: null,
          status: 'discarded',
          fileName: 'old.csv',
          rowCount: 8,
          importedAt: '2026-05-10T12:00:00.000Z',
          completedAt: null,
          discardedAt: '2026-05-11T12:00:00.000Z',
          createdAt: '2026-05-10T12:00:00.000Z',
          updatedAt: '2026-05-11T12:00:00.000Z',
        },
      ],
      nextCursor: 'next_page',
    });

    const res = await app.request('/history?limit=2&cursor=abc');
    const body = (await res.json()) as {
      data: { status: string; createdCount?: number }[];
      nextCursor: string | null;
    };

    expect(res.status).toBe(200);
    expect(listImportHistory).toHaveBeenCalledWith('org_1', {
      limit: 2,
      cursor: 'abc',
    });
    expect(body.nextCursor).toBe('next_page');
    expect(body.data[0]).toMatchObject({
      status: 'completed',
      createdCount: 1,
    });
    expect(body.data[1]).toMatchObject({ status: 'discarded' });
    expect(body.data[1]).not.toHaveProperty('createdCount');
  });

  it('returns INVALID_CURSOR from history when the service rejects the cursor', async () => {
    const { DomainError } = await import('@/lib/errors');
    vi.mocked(listImportHistory).mockRejectedValue(
      new DomainError(400, 'Invalid history cursor.', 'INVALID_CURSOR')
    );

    const res = await app.request('/history?cursor=not-a-cursor');
    const body = (await res.json()) as { error: { code: string } };

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_CURSOR');
  });
});
