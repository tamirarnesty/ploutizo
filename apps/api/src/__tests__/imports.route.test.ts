import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { AppEnv } from '@/types';
import { importsRouter } from '@/routes/imports';
import {
  createNormalizedImportDraft,
  discardImportDraft,
  listImportTargets,
  updateImportDraftRow,
  updateImportDraftRowSelection,
} from '@/services/imports';

vi.mock('@/services/imports', () => ({
  createNormalizedImportDraft: vi.fn(),
  discardImportDraft: vi.fn(),
  getImportDraft: vi.fn(),
  getNormalizedImportExampleCsv: vi.fn(() => 'date,amount,description,type\n'),
  listActiveImportDrafts: vi.fn(() => []),
  listImportHistory: vi.fn(() => []),
  listImportTargets: vi.fn(),
  updateImportDraftRow: vi.fn(),
  updateImportDraftRowSelection: vi.fn(),
}));

const app = new Hono<AppEnv>();
app.use('*', async (c, next) => {
  c.set('orgId', 'org_1');
  await next();
});
app.route('/', importsRouter);

describe('imports router', () => {
  it('returns import targets from the service', async () => {
    vi.mocked(listImportTargets).mockResolvedValue([
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Visa',
        institution: 'TD',
        lastFour: '1234',
      },
    ]);

    const res = await app.request('/targets');
    const body = (await res.json()) as { data: { name: string }[] };

    expect(res.status).toBe(200);
    expect(body.data[0].name).toBe('Visa');
  });

  it('creates an import draft with a normalized CSV payload', async () => {
    vi.mocked(createNormalizedImportDraft).mockResolvedValue({
      reusedExisting: false,
      draft: { id: 'draft_1', rows: [] } as never,
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
    expect(createNormalizedImportDraft).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({ fileName: 'statement.csv' })
    );
  });

  it('returns an existing draft when createNormalizedImportDraft reuses one', async () => {
    vi.mocked(createNormalizedImportDraft).mockResolvedValue({
      reusedExisting: true,
      draft: { id: 'draft_1', rows: [] } as never,
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
    const body = (await res.json()) as {
      data: { id: string };
      meta: { reusedExisting: boolean };
    };

    expect(res.status).toBe(200);
    expect(body.meta.reusedExisting).toBe(true);
    expect(body.data.id).toBe('draft_1');
  });

  it('validates row patch payloads before updating a draft row', async () => {
    vi.mocked(updateImportDraftRow).mockResolvedValue({ id: 'row_1' } as never);

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
      id: 'row_1',
      selectedForImport: true,
    } as never);

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
});
